import time
from typing import Annotated

import jwt
import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app

SECRET = "segredo-de-teste-com-32-bytes-ou-mais!!"


@pytest.fixture
def settings() -> Settings:
    return Settings(
        _env_file=None,
        supabase_jwt_secret=SECRET,
        turnstile_secret_key="teste",
        turnstile_failure_threshold=3,
    )


def make_token(sub: str = "11111111-1111-4111-8111-111111111111", **over) -> str:
    claims = {"sub": sub, "aud": "authenticated", "exp": int(time.time()) + 600,
              "email": "ana@example.com", "role": "authenticated", **over}
    return jwt.encode(claims, SECRET, algorithm="HS256")


@pytest.fixture
def auth() -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token()}"}


@pytest.fixture
def app(settings):
    app = create_app(settings)

    from fastapi import Depends

    from app.security.jwt import CurrentUser, get_current_user

    calls = {"n": 0}

    @app.post("/api/v1/auctions/{auction_id}/bids", status_code=201)
    async def bid(auction_id: str, body: dict, user: Annotated[CurrentUser, Depends(get_current_user)]):
        calls["n"] += 1
        return {"n": calls["n"], "amount": body.get("amount")}

    app.state.calls = calls
    return app


@pytest.fixture
def client(app):
    return TestClient(app, raise_server_exceptions=False)
