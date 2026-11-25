# Schemas compartilhados (Zod)

[← Início](../../README.md)

Validação de formulários e de respostas da API usada pelo web e pelo app, com mensagens em português.

| Arquivo | Conteúdo |
|---|---|
| [src/comum.ts](src/comum.ts) | CPF, e-mail, data de nascimento (18 anos), critérios de senha, código de 6 dígitos |
| [src/auth.ts](src/auth.ts) | Login, cadastro, códigos, redefinição de senha e respostas de sessão |
| [src/conta.ts](src/conta.ts) | Perfil, segurança, 2FA e exclusão de conta |
| [src/problema.ts](src/problema.ts) | Erro RFC 9457 e códigos estáveis da API |

O pacote não instala o `zod`: quem usa fornece a cópia (`peerDependencies`). No web, o alias e o `dedupe` estão no `vite.config.ts`. Os testes rodam junto com os do web (`npm run test` em `web/`).
