"""Validação do JWT emitido pelo Supabase Auth (ADR-09).

Aceita JWKS (chaves assimétricas) ou segredo HS256, conforme a configuração.
"""

from dataclasses import dataclass, field
from functools import lru_cache
from typing import Annotated, Any

import jwt
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from app.core.config import Settings
from app.core.errors import ProblemError

bearer_scheme = HTTPBearer(auto_error=False, bearerFormat="JWT", description="JWT do Supabase Auth")

_WWW = {"WWW-Authenticate": "Bearer"}


@dataclass(frozen=True)
class CurrentUser:
    id: str
    email: str | None
    role: str
    claims: dict[str, Any] = field(repr=False)


@lru_cache
def _jwks_client(url: str) -> PyJWKClient:
    return PyJWKClient(url, cache_keys=True)


def decode_token(token: str, settings: Settings) -> dict[str, Any]:
    """Valida assinatura, expiração, audiência (e emissor, se configurado)."""
    options = {"require": ["exp", "sub"]}
    kwargs: dict[str, Any] = {"audience": settings.supabase_jwt_audience, "options": options}
    if settings.supabase_jwt_issuer:
        kwargs["issuer"] = settings.supabase_jwt_issuer
    try:
        if settings.supabase_jwks_url:
            key = _jwks_client(settings.supabase_jwks_url).get_signing_key_from_jwt(token).key
            return jwt.decode(token, key, algorithms=["ES256", "RS256", "EdDSA"], **kwargs)
        if settings.supabase_jwt_secret:
            return jwt.decode(token, settings.supabase_jwt_secret, algorithms=["HS256"], **kwargs)
    except jwt.ExpiredSignatureError as exc:
        raise ProblemError(401, "TOKEN_EXPIRED", "O token expirou.", headers=_WWW) from exc
    except jwt.PyJWTError as exc:
        raise ProblemError(401, "UNAUTHENTICATED", "Token inválido.", headers=_WWW) from exc
    raise ProblemError(401, "UNAUTHENTICATED", "Validação de JWT não configurada.", headers=_WWW)


async def get_current_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> CurrentUser:
    if credentials is None:
        raise ProblemError(401, "UNAUTHENTICATED", "Envie Authorization: Bearer <jwt>.", headers=_WWW)
    from starlette.concurrency import run_in_threadpool  # JWKS pode buscar rede

    claims = await run_in_threadpool(decode_token, credentials.credentials, request.app.state.settings)
    return CurrentUser(
        id=claims["sub"], email=claims.get("email"), role=claims.get("role", "authenticated"),
        claims=claims,
    )
