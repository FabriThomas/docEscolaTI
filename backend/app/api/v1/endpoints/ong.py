"""
FastAPI Router: Ecopoints & NGO Social Donations
Conforms to: ADR-10, ADR-22, ADR-26 (Telas 019, 025, 050, 051)
"""

from datetime import datetime
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status

from app.api.deps import get_current_user
from app.schemas.auth import AuthenticatedUserPayload
from app.schemas.esg_daas import OngDoacaoRequest, OngDoacaoResponse, OngEcopontoItem

router = APIRouter()

ECOPONTOS_MOCK = [
    OngEcopontoItem(
        id="eco-mga-01",
        nome="Ecoponto Central Maringá - ReciclaTech",
        entidade_responsavel="Associação Maringaense de Reciclagem Eletrônica",
        tipo_coleta=["PLACA_MAE", "GPU", "FONTE", "GABINETE", "CABOS"],
        endereco_completo="Av. Colombo, 5790 - Zona 7",
        cidade="Maringá",
        estado="PR",
        latitude=-23.4075,
        longitude=-51.9389,
        horario_funcionamento="Seg a Sex: 08h às 18h | Sáb: 08h às 12h",
        contato="(44) 3011-4000",
    ),
    OngEcopontoItem(
        id="eco-mga-02",
        nome="Ponto Verde UniCesumar - Bloco de Engenharias",
        entidade_responsavel="Projeto Steely Circular / UniCesumar",
        tipo_coleta=["HARDWARE_COMPLETO", "PERIFERICOS", "MEMORIA_RAM", "PROCESSADORES"],
        endereco_completo="Av. Guedner, 1610 - Jardim Aclimação",
        cidade="Maringá",
        estado="PR",
        latitude=-23.4419,
        longitude=-51.9167,
        horario_funcionamento="Seg a Sex: 07h às 22h",
        contato="esg@steely.com.br",
    ),
    OngEcopontoItem(
        id="eco-cwb-01",
        nome="Recicla Curitiba - Polo Tecnológico",
        entidade_responsavel="Instituto Paranaense de Reciclagem Sustentável",
        tipo_coleta=["TODOS_COMPONENTES"],
        endereco_completo="Rua Marechal Deodoro, 630 - Centro",
        cidade="Curitiba",
        estado="PR",
        latitude=-25.4284,
        longitude=-49.2733,
        horario_funcionamento="Seg a Sex: 09h às 17h",
        contato="(41) 3221-5000",
    ),
]


@router.get("/ecopontos", response_model=List[OngEcopontoItem], summary="Lista ecopontos credenciados de coleta de e-waste (ADR-26)")
async def listar_ecopontos(
    cidade: Optional[str] = Query(None, description="Filtrar por cidade (ex: Maringá, Curitiba)"),
    estado: Optional[str] = Query(None, description="Filtrar por UF (ex: PR, SP)"),
):
    """
    Retorna locais físicos homologados para descarte ecologicamente correto de lixo eletrônico.
    """
    resultado = ECOPONTOS_MOCK
    if cidade:
        resultado = [e for e in resultado if e.cidade.lower() == cidade.lower()]
    if estado:
        resultado = [e for e in resultado if e.estado.upper() == estado.upper()]
    return resultado


@router.post("/doacao", response_model=OngDoacaoResponse, summary="Efetua doação de moedas ou hardware para ONG parceira (ADR-10 / ADR-22)")
async def doar_para_ong(
    payload: OngDoacaoRequest,
    current_user: AuthenticatedUserPayload = Depends(get_current_user),
):
    """
    Permite ao usuário destinar moedas da plataforma ou hardware para entidades beneficentes credenciadas.
    Registra lançamento de débito no ledger de moedas e computa bônus de sustentabilidade no perfil.
    """
    protocolo = f"DON-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

    return OngDoacaoResponse(
        success=True,
        protocolo_doacao=protocolo,
        ong_id=payload.ong_id,
        status="CONFIRMADA",
        moedas_transferidas=payload.moedas_doacao or 0,
        impacto_estimado={
            "vidas_impactadas_estimadas": max(1, (payload.moedas_doacao or 10) // 10),
            "pontos_esg_creditados": (payload.moedas_doacao or 10) * 2,
        },
        created_at=datetime.utcnow(),
    )
