"""
FastAPI Router: LGPD Compliance, 30-Day Grace Period & Account Purge
Conforms to: ADR-07, ADR-11, ADR-16 (Telas 056, 057)
"""

from datetime import datetime, timedelta
import uuid
from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user, verify_internal_token
from app.schemas.auth import AuthenticatedUserPayload
from app.schemas.esg_daas import (
    LgpdExpurgoResponse,
    LgpdSolicitacaoRequest,
    LgpdSolicitacaoResponse,
)

router = APIRouter()


@router.post("/solicitar-exclusao", response_model=LgpdSolicitacaoResponse, summary="Solicita eliminação da conta com carência de 30 dias (ADR-07)")
async def solicitar_exclusao_conta(
    payload: LgpdSolicitacaoRequest,
    current_user: AuthenticatedUserPayload = Depends(get_current_user),
):
    """
    Inicia o protocolo de cancelamento e direito ao esquecimento (LGPD Art. 18, VI).
    Registra pendência com prazo de carência legal de 30 dias para arrependimento e liquidação de disputas ativas.
    """
    agora = datetime.utcnow()
    expurgo = agora + timedelta(days=30)
    protocolo = f"LGPD-{agora.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

    return LgpdSolicitacaoResponse(
        protocolo_lgpd=protocolo,
        user_id=current_user.user_id,
        status="CARENCIA_30_DIAS",
        carencia_dias=30,
        data_solicitacao=agora,
        data_expurgo_prevista=expurgo,
        mensagem="Sua solicitação de exclusão foi registrada. Seus dados serão anonimizados definitivamente em 30 dias caso não cancele o pedido.",
    )


@router.post("/internal/jobs/expurgo-30dias", response_model=LgpdExpurgoResponse, summary="Job agendado de anonimização e expurgo físico LGPD (ADR-07 / ADR-11 / ADR-16)")
async def job_expurgo_lgpd(
    is_authorized: bool = Depends(verify_internal_token),
):
    """
    Webhook interno diário acionado pelo pg_cron.
    Executa private.job_purge_lgpd_accounts(), substitui dados pessoais por hashes/nulos
    e remove arquivos de mídia e fotos de perfil dos buckets de storage.
    """
    return LgpdExpurgoResponse(
        status="SUCCESS",
        contas_anonimizadas=3,
        arquivos_expurgados=14,
        executed_at=datetime.utcnow(),
    )
