"""Armazenamento das chaves de idempotência (ADR-14).

Em produção a tabela `idempotency_keys` do PostgreSQL implementa `IdempotencyStore`
(tarefa de banco). A versão em memória atende desenvolvimento e testes.
"""

import asyncio
import time
from collections.abc import Callable
from dataclasses import dataclass
from enum import Enum
from typing import Protocol


@dataclass
class StoredResponse:
    status: int
    body: bytes
    content_type: str


class Outcome(Enum):
    NEW = "new"
    REPLAY = "replay"
    MISMATCH = "mismatch"
    IN_PROGRESS = "in_progress"


@dataclass
class BeginResult:
    outcome: Outcome
    response: StoredResponse | None = None


class IdempotencyStore(Protocol):
    async def begin(self, scope: str, request_hash: str) -> BeginResult: ...
    async def complete(self, scope: str, response: StoredResponse) -> None: ...
    async def abort(self, scope: str) -> None: ...


@dataclass
class _Entry:
    request_hash: str
    expires_at: float
    response: StoredResponse | None = None


class InMemoryIdempotencyStore:
    def __init__(self, ttl_seconds: float, clock: Callable[[], float] = time.monotonic) -> None:
        self._ttl = ttl_seconds
        self._clock = clock
        self._entries: dict[str, _Entry] = {}
        self._lock = asyncio.Lock()

    async def begin(self, scope: str, request_hash: str) -> BeginResult:
        async with self._lock:
            now = self._clock()
            entry = self._entries.get(scope)
            if entry and entry.expires_at <= now:
                entry = None
            if entry is None:
                self._entries[scope] = _Entry(request_hash, now + self._ttl)
                return BeginResult(Outcome.NEW)
            if entry.request_hash != request_hash:
                return BeginResult(Outcome.MISMATCH)
            if entry.response is None:
                return BeginResult(Outcome.IN_PROGRESS)
            return BeginResult(Outcome.REPLAY, entry.response)

    async def complete(self, scope: str, response: StoredResponse) -> None:
        async with self._lock:
            if scope in self._entries:
                self._entries[scope].response = response

    async def abort(self, scope: str) -> None:
        async with self._lock:
            self._entries.pop(scope, None)
