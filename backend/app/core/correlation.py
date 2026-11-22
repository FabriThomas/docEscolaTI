"""X-Correlation-Id em toda requisição e resposta (RNF-11)."""

import re
import uuid
from contextvars import ContextVar

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

HEADER = "X-Correlation-Id"
_VALID = re.compile(r"^[A-Za-z0-9._-]{8,128}$")

correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="")


def current_correlation_id() -> str:
    return correlation_id_var.get()


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        incoming = request.headers.get(HEADER, "")
        cid = incoming if _VALID.match(incoming) else str(uuid.uuid4())
        request.state.correlation_id = cid
        token = correlation_id_var.set(cid)
        try:
            response = await call_next(request)
        finally:
            correlation_id_var.reset(token)
        response.headers[HEADER] = cid
        return response
