import uuid

import httpx
import pytest

from app.core.config import Settings
from app.core.errors import ProblemError
from app.security.turnstile import CaptchaGate, InMemoryLoginAttemptStore, TurnstileVerifier
from tests.conftest import make_token

BID = "/api/v1/auctions/a1/bids"


def key() -> dict[str, str]:
    return {"Idempotency-Key": str(uuid.uuid4())}


# ---------- contrato, prefixo e erros ----------

def test_openapi_31_sob_prefixo(client):
    spec = client.get("/api/v1/openapi.json").json()
    assert spec["openapi"].startswith("3.1")
    assert "/api/v1/health" in spec["paths"]


def test_health_publico(client):
    r = client.get("/api/v1/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"
    assert r.headers["x-correlation-id"]


def test_404_em_problem_json(client):
    r = client.get("/api/v1/nao-existe", headers={"X-Correlation-Id": "abc-12345678"})
    body = r.json()
    assert r.status_code == 404
    assert r.headers["content-type"].startswith("application/problem+json")
    assert body["code"] == "NOT_FOUND" and body["correlationId"] == "abc-12345678"
    assert {"type", "title", "status", "code", "correlationId"} <= body.keys()


def test_validacao_422_com_errors(client, auth):
    r = client.post(BID, headers={**auth, **key()}, content=b"nao-json",
                    )
    assert r.status_code == 422
    assert r.json()["code"] == "VALIDATION_ERROR" and r.json()["errors"]


def test_erro_inesperado_nao_vaza_detalhe(app):
    @app.get("/api/v1/boom")
    async def boom():
        raise RuntimeError("segredo interno")

    from fastapi.testclient import TestClient

    r = TestClient(app, raise_server_exceptions=False).get("/api/v1/boom")
    assert r.status_code == 500 and "segredo" not in r.text
    assert r.json()["code"] == "INTERNAL_ERROR" and r.headers["x-correlation-id"]


# ---------- JWT ----------

def test_me_sem_token_401(client):
    r = client.get("/api/v1/me")
    assert r.status_code == 401 and r.json()["code"] == "UNAUTHENTICATED"
    assert r.headers["www-authenticate"] == "Bearer"


def test_me_com_token_valido(client, auth):
    r = client.get("/api/v1/me", headers=auth)
    assert r.status_code == 200 and r.json()["email"] == "ana@example.com"


def test_token_expirado_e_invalido(client):
    expired = make_token(exp=1)
    assert client.get("/api/v1/me", headers={"Authorization": f"Bearer {expired}"}).json()["code"] == "TOKEN_EXPIRED"
    assert client.get("/api/v1/me", headers={"Authorization": "Bearer lixo"}).json()["code"] == "UNAUTHENTICATED"


def test_audiencia_errada_rejeitada(client):
    t = make_token(aud="outra")
    assert client.get("/api/v1/me", headers={"Authorization": f"Bearer {t}"}).status_code == 401


# ---------- idempotência ----------

def test_chave_obrigatoria(client, auth):
    r = client.post(BID, headers=auth, json={"amount": 1})
    assert r.status_code == 400 and r.json()["code"] == "IDEMPOTENCY_KEY_REQUIRED"


def test_chave_nao_uuid4(client, auth):
    r = client.post(BID, headers={**auth, "Idempotency-Key": "123"}, json={"amount": 1})
    assert r.status_code == 400


def test_replay_devolve_mesma_resposta_sem_reexecutar(client, app, auth):
    h = {**auth, **key()}
    a = client.post(BID, headers=h, json={"amount": 10})
    b = client.post(BID, headers=h, json={"amount": 10})
    assert a.status_code == b.status_code == 201 and a.json() == b.json()
    assert "idempotent-replayed" not in a.headers
    assert b.headers["idempotent-replayed"] == "true"
    assert app.state.calls["n"] == 1


def test_mesma_chave_corpo_diferente_422(client, auth):
    h = {**auth, **key()}
    client.post(BID, headers=h, json={"amount": 10})
    r = client.post(BID, headers=h, json={"amount": 99})
    assert r.status_code == 422 and r.json()["code"] == "IDEMPOTENCY_KEY_REUSED"


def test_chave_isolada_por_usuario(client, app):
    k = key()
    ha = {"Authorization": f"Bearer {make_token(sub='u-a')}", **k}
    hb = {"Authorization": f"Bearer {make_token(sub='u-b')}", **k}
    client.post(BID, headers=ha, json={"amount": 1})
    r = client.post(BID, headers=hb, json={"amount": 1})
    assert "idempotent-replayed" not in r.headers and app.state.calls["n"] == 2


async def test_em_processamento_409_com_retry_after(app):
    from app.idempotency.store import Outcome

    store = app.state.idempotency_store
    assert (await store.begin("s", "h")).outcome is Outcome.NEW
    assert (await store.begin("s", "h")).outcome is Outcome.IN_PROGRESS


async def test_retencao_72h(settings):
    from app.idempotency.store import InMemoryIdempotencyStore, Outcome, StoredResponse

    now = [0.0]
    store = InMemoryIdempotencyStore(settings.idempotency_ttl_hours * 3600, clock=lambda: now[0])
    await store.begin("s", "h")
    await store.complete("s", StoredResponse(201, b"{}", "application/json"))
    now[0] = 71 * 3600
    assert (await store.begin("s", "h")).outcome is Outcome.REPLAY
    now[0] = 73 * 3600
    assert (await store.begin("s", "h")).outcome is Outcome.NEW


def test_rota_sem_idempotencia_nao_exige_chave(client, auth):
    assert client.get("/api/v1/me", headers=auth).status_code == 200


# ---------- Turnstile ----------

def _gate(settings: Settings, success: bool | None):
    def handler(request: httpx.Request) -> httpx.Response:
        if success is None:
            raise httpx.ConnectError("fora do ar")
        return httpx.Response(200, json={"success": success})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    store = InMemoryLoginAttemptStore()
    return CaptchaGate(settings, store, TurnstileVerifier(settings, client)), store


async def test_captcha_so_a_partir_da_3a_falha(settings):
    gate, store = _gate(settings, True)
    await gate.check("ana", None, None)  # 0 falhas: sem captcha
    await store.register_failure("ana")
    await store.register_failure("ana")
    await gate.check("ana", None, None)  # 2 falhas: ainda sem captcha
    await store.register_failure("ana")  # 3ª falha
    with pytest.raises(ProblemError) as e:
        await gate.check("ana", None, None)
    assert e.value.code == "CAPTCHA_REQUIRED" and e.value.status == 403
    await gate.check("ana", "token-ok", "1.2.3.4")  # com token válido passa


async def test_captcha_invalido_e_falha_fechada(settings):
    gate, store = _gate(settings, False)
    for _ in range(3):
        await store.register_failure("ana")
    with pytest.raises(ProblemError) as e:
        await gate.check("ana", "ruim", None)
    assert e.value.code == "CAPTCHA_REQUIRED"

    gate, store = _gate(settings, None)
    for _ in range(3):
        await store.register_failure("ana")
    with pytest.raises(ProblemError) as e:
        await gate.check("ana", "x", None)
    assert e.value.status == 503 and e.value.code == "CAPTCHA_UNAVAILABLE"
