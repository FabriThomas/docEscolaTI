"""
E2E & Contract Tests for SPRINT14_017:
- ESG Dashboard & Regional k-Anonymity Escalation (ADR-22)
- NGO Donations & Ecopontos (Telas 050, 051)
- DaaS Market Reports (k >= 30, >= 3 sellers) & Internal Sync Job (ADR-04, ADR-16)
- LGPD 30-Day Deletion Request & Purge Job (ADR-07, ADR-16)
"""

from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import create_access_token
from app.main import app

client = TestClient(app)


def _auth_headers() -> dict:
    token = create_access_token(
        user_id="11111111-2222-3333-4444-555555555555",
        email="fabricio@steely.local",
        role="USER",
        kyc_verified=True,
        trust_score=98.0,
    )
    return {"Authorization": f"Bearer {token}"}


def test_esg_me_and_methodology():
    r_me = client.get("/api/v1/esg/me", headers=_auth_headers())
    assert r_me.status_code == 200
    body_me = r_me.json()
    assert body_me["total_transacoes"] >= 1
    assert body_me["co2e_evitado_kg"] > 0

    r_met = client.get("/api/v1/esg/metodologia")
    assert r_met.status_code == 200
    body_met = r_met.json()
    assert body_met["k_anonimato_minimo"] == 30
    assert len(body_met["fatores"]) == 8


def test_esg_plataforma_k30_regional_escalation():
    # NORTE has sample=15 (< 30) -> must escalate automatically to BRASIL_CONSOLIDADO
    r_norte = client.get("/api/v1/esg/plataforma?regiao=NORTE")
    assert r_norte.status_code == 200
    data = r_norte.json()
    assert data["regiao_solicitada"] == "NORTE"
    assert data["regiao_apurada"] == "BRASIL_CONSOLIDADO"
    assert data["escalonamento_aplicado"] is True
    assert data["k_anonimato_atendido"] is True
    assert data["amostra_transacoes"] >= 30


def test_ong_ecopontos_and_doacao():
    r_eco = client.get("/api/v1/ong/ecopontos?cidade=Maringá")
    assert r_eco.status_code == 200
    assert len(r_eco.json()) >= 1

    r_don = client.post(
        "/api/v1/ong/doacao",
        headers=_auth_headers(),
        json={
            "ong_id": "ong-reciclatech-01",
            "tipo_doacao": "MOEDAS",
            "moedas_doacao": 50,
            "mensagem_apoio": "Apoio inclusao digital Steely",
        },
    )
    assert r_don.status_code == 200
    don_body = r_don.json()
    assert don_body["success"] is True
    assert don_body["moedas_transferidas"] == 50


def test_daas_reports_and_sync_job_guard():
    r_rep = client.get("/api/v1/daas/relatorios?categoria=gpu")
    assert r_rep.status_code == 200
    rep = r_rep.json()
    assert rep["k_anonimato_minimo"] == 30
    assert rep["vendedores_minimos"] == 3
    assert all(item["amostra_k"] >= 30 and item["vendedores_distintos"] >= 3 for item in rep["itens"])

    # Internal job without X-Internal-Token must be rejected
    r_unauth = client.post("/api/v1/daas/internal/jobs/sync-daas", json={"forcar_recalculo": True})
    assert r_unauth.status_code in (401, 403)

    # With valid X-Internal-Token must succeed
    r_sync = client.post(
        "/api/v1/daas/internal/jobs/sync-daas",
        headers={"X-Internal-Token": settings.INTERNAL_JOB_TOKEN},
        json={"forcar_recalculo": True},
    )
    assert r_sync.status_code == 200
    assert r_sync.json()["status"] == "SUCCESS"


def test_lgpd_deletion_request_and_purge_job():
    r_req = client.post(
        "/api/v1/lgpd/solicitar-exclusao",
        headers=_auth_headers(),
        json={"motivo": "Encerramento de atividades", "confirmacao_irreversivel": True},
    )
    assert r_req.status_code == 200
    assert r_req.json()["carencia_dias"] == 30

    r_purge = client.post(
        "/api/v1/lgpd/internal/jobs/expurgo-30dias",
        headers={"X-Internal-Token": settings.INTERNAL_JOB_TOKEN},
    )
    assert r_purge.status_code == 200
    assert r_purge.json()["status"] == "SUCCESS"
