# Relatório — EDTS-374 · Fundação FastAPI

[← Back-end](README.md)

| | |
|---|---|
| **Branch** | `EDTS-374_fundacao_fast_api` |
| **Escopo** | Python 3.12 + FastAPI sob `/api/v1`, OpenAPI 3.1, erros RFC 9457, JWT do Supabase, Turnstile, Idempotency-Key (72 h) |
| **ADRs** | [ADR-09](../02-adrs/md/ADR-09_Onde_Fica_a_Autorizacao.md) · [ADR-13](../02-adrs/md/ADR-13_Contrato_e_Versionamento_da_API.md) · [ADR-14](../02-adrs/md/ADR-14_Idempotencia.md) · [ADR-21](../02-adrs/md/ADR-21_Integracao_de_Captcha.md) |
| **Situação** | Código escrito e testado localmente; **não commitado** |

## 1. O que foi entregue

| Requisito | Onde | Como funciona |
|---|---|---|
| Prefixo `/api/v1` e OpenAPI 3.1 | `app/main.py` | Contrato em `/api/v1/openapi.json`, Swagger em `/docs`, Redoc em `/redoc` |
| Snapshot do contrato | `openapi/openapi.snapshot.json`, `scripts/export_openapi.py` | `--check` falha se o código divergir do snapshot (usado no CI) |
| Erros RFC 9457 | `app/core/errors.py` | `application/problem+json` com `type`, `title`, `status`, `detail`, `instance`, `code`, `correlationId`, `errors[]`; trata `ProblemError`, `HTTPException`, validação (422) e erro inesperado (500, sem vazar detalhe) |
| Correlation ID | `app/core/correlation.py` | `X-Correlation-Id` aceito ou gerado, devolvido em toda resposta |
| JWT Supabase | `app/security/jwt.py` | JWKS (ES256/RS256/EdDSA) ou segredo HS256; confere `exp`, `sub`, audiência e, se configurado, emissor; 401 com `WWW-Authenticate` |
| Turnstile | `app/security/turnstile.py` | `CaptchaGate` exige captcha depois de 3 falhas (configurável); valida no servidor na Cloudflare; **falha fechada** (503 `CAPTCHA_UNAVAILABLE`) se ela não responder |
| Idempotency-Key | `app/idempotency/` | UUID v4 obrigatório nos POSTs protegidos; escopo usuário + rota; replay com `Idempotent-Replayed: true`; 422 `IDEMPOTENCY_KEY_REUSED`; 409 `IDEMPOTENCY_IN_PROGRESS` + `Retry-After`; retenção de 72 h; 5xx não é gravado |
| Rotas | `app/api/v1.py` | `GET /health` (público) e `GET /me` (protegido) |
| CI | `.github/workflows/backend.yml` | `ruff`, `pytest` e verificação do snapshot em Python 3.12 |

## 2. Verificação

- `pytest`: **19 testes passaram** (Python 3.14 local; o CI usa 3.12 e ainda não rodou).
- Cobertura dos testes: contrato 3.1, problem+json e `correlationId`, 422 com `errors[]`, 500 sem vazamento, JWT (ausente, válido, expirado, inválido, audiência errada), idempotência (chave ausente, não-UUID4, replay sem reexecutar, corpo diferente, isolamento por usuário, em processamento, retenção de 71 h/73 h), Turnstile (limiar da 3ª falha, token inválido, Cloudflare fora do ar).
- `python ferramentas/verificar_links.py`: 307 de 307 links OK.
- `export_openapi.py --check` passou antes do último ajuste de lint. O `ruff` rodou e corrigiu 2 apontamentos; os testes passaram depois.

## 3. Decisões e suposições

1. **Limiar do captcha:** confirmado no ADR-21: 0 a 2 falhas sem captcha; a partir de 3, captcha obrigatório (403 `CAPTCHA_REQUIRED`). O bloqueio de 15 min na 5ª falha (429 `LOGIN_LOCKED`) fica para a rota de login.
2. **Rotas protegidas por idempotência:** os caminhos (`/auctions/{id}/bids`, `/wallet/(spend|redeem)`, entrega, boost, devolução) são provisórios. Ajustar `PROTECTED_POST_PATTERNS` quando os módulos existirem.
3. **Chave sem token válido:** o middleware valida o formato da chave e deixa a rota responder 401, em vez de gravar a chave de um usuário desconhecido.
4. **Armazenamento:** contador de falhas de login e chaves de idempotência ficam atrás de interfaces (`LoginAttemptStore`, `IdempotencyStore`) com implementação **em memória**.

## 4. Limitações conhecidas

- Em memória, o estado se perde ao reiniciar e não é compartilhado entre processos: a idempotência **não é garantida de verdade** até existir a versão em PostgreSQL (`idempotency_keys`, `auth_login_attempts`).
- `GET /health` devolve `not_configured` até as conexões Core e DaaS serem registradas em `app.state.health_checks`.
- O middleware lê o corpo inteiro da requisição e da resposta na memória (adequado para JSON pequeno).
- Não testado: JWKS real do Supabase, chamada real à Cloudflare, Python 3.12, execução no CI.

## 5. Fora do escopo (próximas tarefas)

- Limite de taxa com `slowapi` e leitura de `CF-Connecting-IP` (ADR-13).
- Rotas `auth/*` (login, cadastro, renovação, logout) usando o `CaptchaGate`.
- Rotas `internal/jobs/*` com `X-Internal-Token` e resposta 202 (o Fabrício já escreveu `sync-daas` e `expurgo-30dias` em outro repositório).
- Implementações PostgreSQL das duas interfaces e o `SELECT 1` do health.
- Lint (Spectral) e `oasdiff` no CI.
- As telas PROTOTIPAGEM_052 a 055 citadas na tarefa não têm código aqui; o backend não cria telas.

## 6. Integração com o código do Fabrício (SPRINT14-017)

- Os endpoints dele (`app/api/v1/endpoints/`) importam `app.api.deps`, `app.schemas.esg_daas`, `app.core.security` (`create_access_token`) e `app.core.config.settings`, que **não existem neste repositório**. Por isso `tests/test_esg_daas_ong_lgpd.py` não roda aqui e o CI ignora esse arquivo até o resto do código ser trazido.
- A fundação valida o JWT emitido pelo **Supabase**; o teste dele gera um token próprio com `create_access_token`. É preciso decidir qual dos dois fica.
- O router de módulos ainda não está incluído em `app/api/v1/__init__.py`.
