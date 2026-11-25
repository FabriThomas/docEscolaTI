# Web

[← Início](../README.md)

Aplicação web do Steely (EDTS-379): a experiência do usuário final no navegador.

| | |
|---|---|
| **Tecnologia** | React 19 + Vite + TypeScript · TanStack Query + Zustand · React Router |
| **Interface** | Tailwind CSS v4 lendo os [tokens](../packages/tokens/README.md) · Radix UI · ícones Lucide |
| **Formulários** | React Hook Form + [schemas Zod compartilhados](../packages/schemas/README.md) |
| **Captcha** | Cloudflare Turnstile |
| **Hospedagem** | Cloudflare Pages (`public/_redirects` faz o fallback da SPA) |

## Rodar no seu computador

```bash
cd web
npm install
npm run dev
```

Abra <http://localhost:5173>. Sem `VITE_API_URL`, o site usa uma **API simulada** (MSW) com o mesmo contrato esperado do FastAPI. Contas de demonstração (dados inventados), senha `Steely@2026`, código `123456`:

- `ana.pereira@exemplo.com` — com verificação em duas etapas e 340 moedas
- `bruno.lima@exemplo.com` — sem verificação em duas etapas e sem saldo

Errar a senha 3 vezes mostra o captcha; 5 vezes bloqueia por 15 minutos (recarregue a página para zerar).

## Com o backend (FastAPI)

O backend da EDTS-374 já tem `GET /api/v1/health` e `GET /api/v1/me`. Para usar o web com ele:

1. Suba o FastAPI em `http://127.0.0.1:8000` (veja [backend/README.md](../backend/README.md)), com o `backend/.env` copiado do `.env.example`.
2. Rode o web no modo híbrido:

```bash
npm run dev:hibrido
```

Nesse modo, `/api` vai para o FastAPI pelo proxy do Vite. As rotas que ele já tem (lista em [src/api/rotas-backend.json](src/api/rotas-backend.json)) são atendidas de verdade, e o resto (login, cadastro, perfil, segurança) continua simulado. O login simulado assina um JWT HS256 com o segredo de **teste** do backend, então o `GET /me` real aceita a sessão. O status do servidor aparece no rodapé e no aviso de demonstração.

Quando o backend ganhar rotas novas, atualize os tipos e a lista:

```bash
npm run api:types
```

O script lê `../backend/openapi/openapi.snapshot.json`, gera [src/api/schema.d.ts](src/api/schema.d.ts) e o cliente tipado em [src/api/cliente.ts](src/api/cliente.ts) passa a enxergar as rotas novas (openapi-fetch, ADR-18).

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (API simulada) |
| `npm run dev:hibrido` | Desenvolvimento com o FastAPI local nas rotas prontas |
| `npm run build` | Build de produção (`dist/`) |
| `npm run build:demo` | Build de produção com a API simulada |
| `npm run typecheck` | Verificação de tipos |
| `npm run lint` | oxlint (com jsx-a11y) + verificação de tokens (sem hex, px solto ou `style` inline) |
| `npm run test` / `test:cobertura` | Vitest + Testing Library + axe |
| `npm run e2e` | Playwright em 360 px e 1440 px (Edge local; Chromium no CI) |
| `npm run lighthouse` | Lighthouse CI com nota mínima 0,9 (relatórios em `lighthouse/`) |
| `npm run tokens` | Regera os tokens a partir de `packages/tokens/tokens.json` |
| `npm run api:types` | Gera os tipos e a lista de rotas a partir do snapshot do OpenAPI do backend |

Variáveis de ambiente: veja [.env.example](.env.example).

## Telas

| Rota | Tela | Protótipo / caso de uso |
|---|---|---|
| `/entrar` | Login, captcha a partir da 3ª falha, bloqueio, 2FA, reativação na carência | 01 · STY002, STY004 |
| `/criar-conta` | Cadastro com CPF, 18 anos, critérios de senha, captcha e termos | 02 · STY001 |
| `/verificar-email` | Código de 6 dígitos com validade e reenvio | 03 · STY001 |
| `/recuperar-senha`, `/redefinir-senha` | Recuperação com mensagem neutra e nova senha | 04 · STY005 |
| `/entrar-com-codigo` | Login por código de uso único | 05 · STY006 |
| `/perfil` | Meu perfil | 052 · STY011 |
| `/perfil/editar` | Editar perfil e foto | 053 · STY011 |
| `/seguranca` | 2FA, senha, códigos de recuperação e sessões | 054 · STY007 a STY009 |
| `/conta/excluir` | Pedido de exclusão com carência de 30 dias | 056 · STY010 |
| `/sobre`, `/termos`, `/privacidade`, `/ajuda` | Institucionais | 045 a 048 |

Busca, anúncios, chat, carteira e ESG aparecem na navegação como "em breve": são de outras tarefas.

## Organização

```
src/
  api/         cliente HTTP, chaves de cache e hooks por domínio (auth, conta)
  app/         providers (TanStack Query)
  components/  Design System (ui/) e layouts (layout/)
  features/    telas: auth, conta, institucional
  mocks/       API simulada (MSW) e contas de demonstração
  stores/      estado de interface (Zustand)
  styles/      Tailwind + tokens
e2e/           testes Playwright
```

## Decisões e pressupostos

- **Contrato da API** (ADR-13): `/api/v1`, JSON em camelCase, erros RFC 9457 com `code`, `X-Correlation-Id` em toda requisição. `/health` e `/me` usam o cliente gerado do snapshot; as demais rotas (login, perfil, segurança) estão em [src/api/auth.ts](src/api/auth.ts) e [src/api/conta.ts](src/api/conta.ts) e precisam ser confirmadas quando o backend as criar.
- **Sessão** (ADR-18): o JWT fica só em memória; ao recarregar, `POST /auth/refresh` restaura a sessão por um cookie HttpOnly do FastAPI (pressuposto).
- **Captcha** (ADR-21): token enviado no cabeçalho `X-Turnstile-Token` (pressuposto); no login só aparece depois de `403 CAPTCHA_REQUIRED`.
- **Contraste**: o cinza `#6B7A8D` tem só 3,6:1 sobre a superfície; em texto, o token `text.muted` usa branco 60% (≥ 6,2:1). O cinza fica para ícones e bordas de campos.
- **Exclusão** (056): o protótipo diz que o saldo é sacado, mas a regra STY010-RN02 v2 e o ADR-07 dizem que saldo de moedas impede a exclusão. A tela segue a regra.

## Decisões que se aplicam aqui

| ADR | Assunto |
|---|---|
| [ADR-18](../02-adrs/md/ADR-18_Gerenciamento_de_Estado_e_Dados_no_Cliente.md) | Estado e cache de dados |
| [ADR-19](../02-adrs/md/ADR-19_Validacao_e_Schemas_Compartilhados.md) | Design system compartilhado com o mobile |
| [ADR-20](../02-adrs/md/ADR-20_Estrategia_de_Renderizacao_Web.md) | Acessibilidade (WCAG 2.1 AA) e responsividade |
| [ADR-21](../02-adrs/md/ADR-21_Integracao_de_Captcha.md) | Provedor de captcha |
| [ADR-22](../02-adrs/md/ADR-22_Agregacao_de_Metricas_ESG.md) | Dashboard e métricas ESG |
