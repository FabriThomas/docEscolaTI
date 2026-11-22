"""Cloudflare Turnstile verificado no servidor (ADR-21).

O captcha só é exigido depois de N falhas de login (padrão 3). O contador de falhas deve
ficar no PostgreSQL (tabela auth_login_attempts, ADR-08/ADR-13); aqui há a interface e uma
implementação em memória para desenvolvimento e testes.
"""

from collections import defaultdict
from typing import Protocol

import httpx

from app.core.config import Settings
from app.core.errors import ProblemError


class LoginAttemptStore(Protocol):
    async def failures(self, identifier: str) -> int: ...
    async def register_failure(self, identifier: str) -> int: ...
    async def reset(self, identifier: str) -> None: ...


class InMemoryLoginAttemptStore:
    def __init__(self) -> None:
        self._counts: dict[str, int] = defaultdict(int)

    async def failures(self, identifier: str) -> int:
        return self._counts[identifier]

    async def register_failure(self, identifier: str) -> int:
        self._counts[identifier] += 1
        return self._counts[identifier]

    async def reset(self, identifier: str) -> None:
        self._counts.pop(identifier, None)


class TurnstileVerifier:
    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None) -> None:
        self._settings = settings
        self._client = client

    async def verify(self, token: str, remote_ip: str | None = None) -> bool:
        data = {"secret": self._settings.turnstile_secret_key, "response": token}
        if remote_ip:
            data["remoteip"] = remote_ip
        try:
            if self._client is not None:
                resp = await self._client.post(self._settings.turnstile_verify_url, data=data)
            else:
                async with httpx.AsyncClient(timeout=self._settings.turnstile_timeout_seconds) as c:
                    resp = await c.post(self._settings.turnstile_verify_url, data=data)
            resp.raise_for_status()
            return bool(resp.json().get("success"))
        except (httpx.HTTPError, ValueError) as exc:
            # Falha fechada: sem confirmar o captcha, não libera a tentativa.
            raise ProblemError(
                503, "CAPTCHA_UNAVAILABLE", "Não foi possível validar o captcha. Tente novamente."
            ) from exc


class CaptchaGate:
    """Chame `await gate.check(...)` no início do login; `register_failure`/`reset` depois."""

    def __init__(self, settings: Settings, attempts: LoginAttemptStore, verifier: TurnstileVerifier):
        self._threshold = settings.turnstile_failure_threshold
        self.attempts = attempts
        self._verifier = verifier

    async def required(self, identifier: str) -> bool:
        return await self.attempts.failures(identifier) >= self._threshold

    async def check(self, identifier: str, token: str | None, remote_ip: str | None) -> None:
        if not await self.required(identifier):
            return
        if not token:
            raise ProblemError(403, "CAPTCHA_REQUIRED", "Resolva o captcha para continuar.")
        if not await self._verifier.verify(token, remote_ip):
            raise ProblemError(403, "CAPTCHA_REQUIRED", "Captcha inválido ou expirado.")
