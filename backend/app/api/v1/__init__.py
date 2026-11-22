"""Rotas da v1. Cada módulo novo ganha seu próprio arquivo e é incluído aqui."""

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from app.core.errors import PROBLEM_RESPONSES
from app.security.jwt import CurrentUser, get_current_user

router = APIRouter(responses=PROBLEM_RESPONSES)


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class Health(CamelModel):
    status: str
    core_db: str
    daas_db: str


class Me(CamelModel):
    id: str
    email: str | None = None
    role: str


@router.get("/health", tags=["infra"], response_model=Health, summary="Health check")
async def health(request: Request) -> Health:
    """Sem autenticação. Os checks (`SELECT 1` nos bancos Core e DaaS) entram com o módulo de banco."""
    checks = getattr(request.app.state, "health_checks", {})
    core = await checks["core_db"]() if "core_db" in checks else "not_configured"
    daas = await checks["daas_db"]() if "daas_db" in checks else "not_configured"
    ok = all(v in ("up", "not_configured") for v in (core, daas))
    return Health(status="ok" if ok else "degraded", core_db=core, daas_db=daas)


@router.get("/me", tags=["auth"], response_model=Me, summary="Usuário do token")
async def me(user: Annotated[CurrentUser, Depends(get_current_user)]) -> Me:
    return Me(id=user.id, email=user.email, role=user.role)
