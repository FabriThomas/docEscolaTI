"""Middleware de Idempotency-Key (ADR-14).

Regras: UUID v4 obrigatório nos POST das rotas protegidas (ausente → 400
IDEMPOTENCY_KEY_REQUIRED); escopo por usuário + rota; mesma chave e mesmo corpo devolve a
resposta gravada com `Idempotent-Replayed: true`; corpo diferente → 422
IDEMPOTENCY_KEY_REUSED; ainda em processamento → 409 IDEMPOTENCY_IN_PROGRESS + Retry-After.
Retenção de 72 h (configurável). Respostas 5xx não são gravadas, para permitir novo envio.
"""

import hashlib
import re
import uuid

from starlette.concurrency import run_in_threadpool
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import API_PREFIX
from app.core.errors import ProblemError, problem_response
from app.idempotency.store import Outcome, StoredResponse
from app.security.jwt import decode_token

HEADER = "Idempotency-Key"

# POSTs que exigem a chave: lance, moedas, entrega, boost e devolução (ADR-14).
# Ajuste conforme as rotas de cada módulo forem criadas.
PROTECTED_POST_PATTERNS = [
    re.compile(rf"^{API_PREFIX}/auctions/[^/]+/bids/?$"),
    re.compile(rf"^{API_PREFIX}/wallet/(spend|redeem)/?$"),
    re.compile(rf"^{API_PREFIX}/orders/[^/]+/delivery-confirmation/?$"),
    re.compile(rf"^{API_PREFIX}/offers/[^/]+/boost/?$"),
    re.compile(rf"^{API_PREFIX}/orders/[^/]+/returns/?$"),
]


def requires_idempotency(method: str, path: str) -> bool:
    return method == "POST" and any(p.match(path) for p in PROTECTED_POST_PATTERNS)


def _valid_uuid4(value: str) -> bool:
    try:
        return uuid.UUID(value).version == 4
    except ValueError:
        return False


class IdempotencyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if not requires_idempotency(request.method, request.url.path):
            return await call_next(request)

        key = request.headers.get(HEADER)
        if not key or not _valid_uuid4(key):
            detail = (
                f"O cabeçalho {HEADER} (UUID v4) é obrigatório."
                if not key
                else f"{HEADER} deve ser um UUID v4."
            )
            return problem_response(400, "IDEMPOTENCY_KEY_REQUIRED", detail, instance=request.url.path)

        user_id = await self._user_id(request)
        if user_id is None:  # sem token válido: a autenticação da rota responde 401
            return await call_next(request)

        body = await request.body()
        scope = f"{user_id}:{request.url.path}:{key}"
        request_hash = hashlib.sha256(body).hexdigest()
        store = request.app.state.idempotency_store

        result = await store.begin(scope, request_hash)
        if result.outcome is Outcome.MISMATCH:
            return problem_response(
                422, "IDEMPOTENCY_KEY_REUSED",
                "Esta chave já foi usada com um corpo diferente.", instance=request.url.path,
            )
        if result.outcome is Outcome.IN_PROGRESS:
            return problem_response(
                409, "IDEMPOTENCY_IN_PROGRESS",
                "A requisição original ainda está em processamento.",
                instance=request.url.path, headers={"Retry-After": "1"},
            )
        if result.outcome is Outcome.REPLAY and result.response:
            stored = result.response
            return Response(
                stored.body, status_code=stored.status, media_type=stored.content_type,
                headers={"Idempotent-Replayed": "true"},
            )

        try:
            response = await call_next(request)
            payload = b"".join([chunk async for chunk in response.body_iterator])  # type: ignore[attr-defined]
        except BaseException:
            await store.abort(scope)
            raise

        content_type = response.headers.get("content-type", "application/json")
        if response.status_code >= 500:
            await store.abort(scope)
        else:
            await store.complete(scope, StoredResponse(response.status_code, payload, content_type))

        headers = {k: v for k, v in response.headers.items() if k.lower() != "content-length"}
        return Response(payload, status_code=response.status_code, headers=headers)

    @staticmethod
    async def _user_id(request: Request) -> str | None:
        auth = request.headers.get("authorization", "")
        scheme, _, token = auth.partition(" ")
        if scheme.lower() != "bearer" or not token:
            return None
        try:
            claims = await run_in_threadpool(decode_token, token, request.app.state.settings)
        except ProblemError:
            return None
        return claims["sub"]
