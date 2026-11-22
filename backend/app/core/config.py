"""Configuração lida de variáveis de ambiente (nunca grave segredos no código)."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

API_PREFIX = "/api/v1"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "local"
    cors_origins: str = ""

    # Supabase Auth (JWKS tem prioridade sobre o segredo HS256)
    supabase_jwks_url: str = ""
    supabase_jwt_secret: str = ""
    supabase_jwt_audience: str = "authenticated"
    supabase_jwt_issuer: str = ""

    # Cloudflare Turnstile (ADR-21)
    turnstile_secret_key: str = ""
    turnstile_verify_url: str = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    turnstile_failure_threshold: int = Field(default=3, ge=1)
    turnstile_timeout_seconds: float = 5.0

    # Idempotência (ADR-14): 72 h, alinhado ao tempo máximo offline do app
    idempotency_ttl_hours: int = Field(default=72, ge=1)

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
