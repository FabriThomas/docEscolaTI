# Back-end — API

[← Início](../README.md)

API REST que concentra as regras de negócio do Steely. Toda escrita e toda leitura protegida passam por ela; os apps só falam direto com o Supabase para o Realtime.

| | |
|---|---|
| **Tecnologia** | Python · FastAPI · Pydantic v2 |
| **Hospedagem** | Render |
| **Banco** | PostgreSQL no Supabase — ver [database/](../database/) |

## Decisões que se aplicam aqui

| ADR | Assunto |
|---|---|
| [ADR-09](../02-adrs/md/ADR-09_Onde_Fica_a_Autorizacao.md) | Autorização em duas camadas (FastAPI + PostgreSQL) |
| [ADR-13](../02-adrs/md/ADR-13_Contrato_e_Versionamento_da_API.md) | Contrato OpenAPI, versionamento `/api/v1` e formato de erro |
| [ADR-14](../02-adrs/md/ADR-14_Idempotencia.md) | Idempotência com `Idempotency-Key` |
| [ADR-15](../02-adrs/md/ADR-15_Concorrencia_dos_Lances.md) | Concorrência dos lances nos leilões |
| [ADR-16](../02-adrs/md/ADR-16_Tarefas_Agendadas.md) | Tarefas agendadas (`pg_cron`) |
| [ADR-17](../02-adrs/md/ADR-17_Estrategia_de_Testes.md) | Estratégia de testes |
| [ADR-02](../02-adrs/md/ADR-02_Censura_de_Dados_Pessoais_e_Contatos.md) | Censura de dados pessoais no chat |
| [ADR-03](../02-adrs/md/ADR-03_Escrow_Simulado.md) | Escrow e retenção de 7 dias |
| [ADR-21](../02-adrs/md/ADR-21_Integracao_de_Captcha.md) | Cloudflare Turnstile a partir da 3ª falha de login |

## Estrutura

```
backend/
├── app/
│   ├── main.py              # create_app(): prefixo /api/v1, middlewares, handlers
│   ├── api/v1/              # __init__.py: router (health, me); endpoints/: módulos (ESG, DaaS, ONG, LGPD)
│   ├── core/                # config (env), correlation-id, erros RFC 9457
│   ├── security/            # jwt.py (Supabase Auth), turnstile.py (ADR-21)
│   └── idempotency/         # middleware e armazenamento (ADR-14, retenção 72 h)
├── openapi/openapi.snapshot.json   # contrato OpenAPI 3.1 versionado (ADR-13)
├── scripts/export_openapi.py
└── tests/
```

## Como rodar

Requer Python 3.12. Copie `.env.example` para `.env` e ajuste.

```bash
cd backend
python -m venv .venv
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

Swagger UI em `/api/v1/docs`, Redoc em `/api/v1/redoc` e o contrato em `/api/v1/openapi.json`.

```bash
pytest
python scripts/export_openapi.py          # atualiza o snapshot após mudar rota ou schema
python scripts/export_openapi.py --check  # o CI falha se o snapshot estiver desatualizado
```

## O que a fundação entrega

- **Erros RFC 9457** (`application/problem+json`) com `type`, `title`, `status`, `detail`, `instance`, `code`, `correlationId` e `errors[]`; levante `ProblemError(status, "CODIGO", detalhe)`.
- **`X-Correlation-Id`** em toda resposta (gerado se o cliente não enviar).
- **JWT do Supabase Auth**: dependência `get_current_user`, com JWKS (`SUPABASE_JWKS_URL`) ou segredo HS256.
- **Turnstile**: `CaptchaGate.check(...)` no login exige o captcha depois de `TURNSTILE_FAILURE_THRESHOLD` falhas (padrão 3) e falha fechada se a Cloudflare não responder.
- **`Idempotency-Key`**: UUID v4 obrigatório nos POSTs listados em `PROTECTED_POST_PATTERNS` (`app/idempotency/middleware.py`); replay com `Idempotent-Replayed: true`, `422 IDEMPOTENCY_KEY_REUSED`, `409 IDEMPOTENCY_IN_PROGRESS`.

## Pendências conhecidas

- O contador de falhas de login e o armazenamento das chaves de idempotência estão **em memória**; as implementações em PostgreSQL (`auth_login_attempts`, `idempotency_keys`) entram com a tarefa de banco.
- `GET /api/v1/health` devolve `not_configured` até existirem as conexões Core e DaaS.
- Rate limit (`slowapi`), rotas de autenticação, `internal/jobs` e as rotas de negócio ficam para as próximas tarefas; ajuste `PROTECTED_POST_PATTERNS` conforme elas nascerem.
