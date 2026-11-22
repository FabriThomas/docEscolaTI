"""Ponto de entrada: `uvicorn app.main:app`."""

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import router as v1_router
from app.core.config import API_PREFIX, Settings, get_settings
from app.core.correlation import CorrelationIdMiddleware
from app.core.errors import register_error_handlers
from app.idempotency.middleware import IdempotencyMiddleware
from app.idempotency.store import IdempotencyStore, InMemoryIdempotencyStore
from app.security.turnstile import (
    CaptchaGate,
    InMemoryLoginAttemptStore,
    LoginAttemptStore,
    TurnstileVerifier,
)


def create_app(
    settings: Settings | None = None,
    *,
    idempotency_store: IdempotencyStore | None = None,
    login_attempts: LoginAttemptStore | None = None,
    http_client: httpx.AsyncClient | None = None,
) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(
        title="Steely API",
        version="1.0.0",
        summary="Marketplace de hardware de TI reaproveitável com laudo por IA",
        openapi_url=f"{API_PREFIX}/openapi.json",
        docs_url=f"{API_PREFIX}/docs",
        redoc_url=f"{API_PREFIX}/redoc",
    )

    app.state.settings = settings
    app.state.idempotency_store = idempotency_store or InMemoryIdempotencyStore(
        ttl_seconds=settings.idempotency_ttl_hours * 3600
    )
    app.state.captcha_gate = CaptchaGate(
        settings,
        login_attempts or InMemoryLoginAttemptStore(),
        TurnstileVerifier(settings, http_client),
    )

    register_error_handlers(app)

    # O último adicionado é o mais externo: correlação envolve tudo.
    app.add_middleware(IdempotencyMiddleware)
    if settings.cors_origin_list:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origin_list,
            allow_methods=["*"],
            allow_headers=["*"],
            expose_headers=["X-Correlation-Id", "Idempotent-Replayed", "Retry-After"],
        )
    app.add_middleware(CorrelationIdMiddleware)

    app.include_router(v1_router, prefix=API_PREFIX)
    return app


app = create_app()
