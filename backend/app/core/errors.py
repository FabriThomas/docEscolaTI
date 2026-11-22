"""Erros no padrão RFC 9457 (application/problem+json) — ADR-13.

Campos: type, title, status, detail, instance, code (estável), correlationId e errors[].
"""

from http import HTTPStatus
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.correlation import current_correlation_id

PROBLEM_JSON = "application/problem+json"
PROBLEM_TYPE_BASE = "https://steely.app/problems"

# Códigos fixados no ADR-13 (mais os genéricos usados pela fundação).
CODES = {
    "AUCTION_ENDED", "BID_TOO_LOW", "BID_OUTDATED", "ALREADY_LEADING",
    "INSUFFICIENT_COINS_HOLD", "IDEMPOTENCY_KEY_REQUIRED", "IDEMPOTENCY_KEY_REUSED",
    "IDEMPOTENCY_IN_PROGRESS", "OFFER_NOT_AVAILABLE", "QR_EXPIRED", "QR_SIGNATURE_INVALID",
    "RETURN_WINDOW_CLOSED", "RATE_LIMITED", "CAPTCHA_REQUIRED", "PII_OR_CONTACT_DETECTED",
    "ACCOUNT_IN_GRACE_PERIOD",
    "UNAUTHENTICATED", "TOKEN_EXPIRED", "VALIDATION_ERROR", "NOT_FOUND", "FORBIDDEN",
    "METHOD_NOT_ALLOWED", "BAD_REQUEST", "CONFLICT", "NOT_IMPLEMENTED",
    "CAPTCHA_UNAVAILABLE", "INTERNAL_ERROR",
}


class FieldError(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    field: str
    message: str
    code: str | None = None


class Problem(BaseModel):
    """Corpo de erro RFC 9457, usado no contrato OpenAPI."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    type: str = Field(examples=[f"{PROBLEM_TYPE_BASE}/bid-too-low"])
    title: str
    status: int
    detail: str | None = None
    instance: str | None = None
    code: str = Field(examples=["BID_TOO_LOW"])
    correlation_id: str
    errors: list[FieldError] = []


class ProblemError(Exception):
    """Levante em qualquer ponto para devolver um problem+json."""

    def __init__(
        self,
        status: int,
        code: str,
        detail: str | None = None,
        *,
        title: str | None = None,
        errors: list[dict[str, Any]] | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(detail or code)
        self.status = status
        self.code = code
        self.detail = detail
        self.title = title
        self.errors = errors or []
        self.headers = headers or {}


def _default_title(status: int) -> str:
    try:
        return HTTPStatus(status).phrase
    except ValueError:
        return "Error"


def problem_response(
    status: int,
    code: str,
    detail: str | None = None,
    *,
    instance: str | None = None,
    title: str | None = None,
    errors: list[dict[str, Any]] | None = None,
    headers: dict[str, str] | None = None,
    correlation_id: str | None = None,
) -> JSONResponse:
    body = {
        "type": f"{PROBLEM_TYPE_BASE}/{code.lower().replace('_', '-')}",
        "title": title or _default_title(status),
        "status": status,
        "detail": detail,
        "instance": instance,
        "code": code,
        "correlationId": correlation_id or current_correlation_id(),
        "errors": errors or [],
    }
    return JSONResponse(
        {k: v for k, v in body.items() if v is not None},
        status_code=status,
        media_type=PROBLEM_JSON,
        headers=headers,
    )


_HTTP_CODES = {
    400: "BAD_REQUEST", 401: "UNAUTHENTICATED", 403: "FORBIDDEN", 404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED", 409: "CONFLICT", 422: "VALIDATION_ERROR", 429: "RATE_LIMITED",
    501: "NOT_IMPLEMENTED",
}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ProblemError)
    async def _problem(request: Request, exc: ProblemError) -> JSONResponse:
        return problem_response(
            exc.status, exc.code, exc.detail, instance=request.url.path,
            title=exc.title, errors=exc.errors, headers=exc.headers,
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = _HTTP_CODES.get(exc.status_code, "INTERNAL_ERROR" if exc.status_code >= 500 else "BAD_REQUEST")
        detail = exc.detail if isinstance(exc.detail, str) else None
        return problem_response(
            exc.status_code, code, detail, instance=request.url.path,
            headers=dict(exc.headers) if exc.headers else None,
        )

    @app.exception_handler(RequestValidationError)
    async def _validation(request: Request, exc: RequestValidationError) -> JSONResponse:
        errors = [
            {
                "field": ".".join(str(p) for p in e["loc"]),
                "message": e["msg"],
                "code": e["type"],
            }
            for e in exc.errors()
        ]
        return problem_response(
            422, "VALIDATION_ERROR", "Um ou mais campos são inválidos.",
            instance=request.url.path, errors=errors,
        )

    @app.exception_handler(Exception)
    async def _unexpected(request: Request, exc: Exception) -> JSONResponse:
        # Detalhes internos nunca vazam para o cliente; o correlationId liga ao log.
        # Este handler roda fora do middleware de correlação: o id vem do request.state.
        cid = getattr(request.state, "correlation_id", "") or current_correlation_id()
        response = problem_response(
            500, "INTERNAL_ERROR", "Erro interno. Informe o correlationId ao suporte.",
            instance=request.url.path, correlation_id=cid,
        )
        response.headers["X-Correlation-Id"] = cid
        return response


PROBLEM_RESPONSES: dict[int | str, dict[str, Any]] = {
    status: {"model": Problem, "description": desc, "content": {PROBLEM_JSON: {}}}
    for status, desc in {
        400: "Requisição malformada ou cabeçalho obrigatório ausente",
        401: "Sem autenticação válida",
        403: "Acesso bloqueado",
        404: "Não encontrado",
        409: "Conflito de estado, concorrência ou idempotência",
        422: "Validação de campo ou regra de negócio violada",
        429: "Limite de taxa excedido (Retry-After)",
    }.items()
}
