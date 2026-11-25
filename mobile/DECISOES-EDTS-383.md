# Decisões da EDTS-383 (perfil, segurança e armazenamento no aparelho)

[← Mobile](README.md)

O que o app faz quando as fontes não batem ou não dizem nada. Cada linha pode mudar quando o grupo decidir.

## Onde foi pesquisado

- Jira EDTS-383.
- Requisitos e regras: [Requisitos_Steely.md](../01-planejamento/Requisitos_Steely.md), [Regras_de_Negocio.md](../01-planejamento/Regras_de_Negocio.md) (STY002, STY007 a STY011), [Especificacao_de_Casos_de_Uso.md](../01-planejamento/Especificacao_de_Casos_de_Uso.md).
- Arquivos originais (PDF, DOCX e XLSX convertidos para texto) em [01-planejamento/originais](../01-planejamento/originais/).
- ADRs: [ADR-07](../02-adrs/md/ADR-07_Anonimizacao_em_30_Dias_LGPD.md), [ADR-14](../02-adrs/md/ADR-14_Idempotencia.md), [ADR-21](../02-adrs/md/ADR-21_Integracao_de_Captcha.md), [ADR-23](../02-adrs/md/ADR-23_Offline_First.md) e [ADR-24](../02-adrs/md/ADR-24_Armazenamento_Seguro_no_Dispositivo.md).
- Protótipos 01 (login), 052, 053 e 054 e o [Prototipo_Alta_Fidelidade_Telas.md](../01-planejamento/Prototipo_Alta_Fidelidade_Telas.md).
- Banco: [migrations](../supabase/migrations/), da 0001 à 0005.
- Branches abertas dos colegas, sem merge: EDTS-374 (backend), com só `/health` e `/me`, e EDTS-379 (web), cujo mock (`web/src/mocks/handlers.ts`) foi usado como contrato das rotas de login, perfil e segurança.

## Armazenamento e offline (ADR-23 e ADR-24)

| Assunto | Fontes | O que o app faz |
|---|---|---|
| Tokens | ADR-24. | `expo-secure-store` com as chaves `STEELY_JWT_ACCESS`, `STEELY_JWT_REFRESH` e `STEELY_ED25519_PUB`, tudo em `src/secureStorage.ts`. A chave pública precisa ter 44 caracteres. |
| Biometria | ADR-24: opcional. | Não foi feita nesta tarefa. |
| Banco local | ADR-23. | WatermelonDB com `routes`, `appointments`, `meeting_points` e `pending_mutations`, todas com `updated_at` e `is_deleted`. Validade: rotas 24 h, encontros 1 h, pontos 7 dias. |
| Sincronização | ADR-23: ao voltar a internet, em até 10 s (RNF-07). | NetInfo dispara a fila e depois o `synchronize()`. A fila manda `Idempotency-Key` (ADR-14) e apaga o item quando dá certo ou quando vem `IDEMPOTENCY_KEY_REUSED`. |
| Rotas de sync | Nenhuma fonte define. | `GET /sync/pull?lastPulledAt=` e `POST /sync/push?lastPulledAt=`. **Proposta, precisa combinar com o backend.** |
| Limpeza | ADR-23: na exclusão ou revogação. | `limparAparelho()` zera o banco e apaga as 3 chaves. Na exclusão, tenta mandar a fila antes. |
| Refresh com falha | ADR-24. | Só apaga o aparelho quando o servidor recusa o refresh (400, 401 ou 403). Sem internet ou com erro 5xx, mantém tudo e tenta de novo depois. Duas 401 ao mesmo tempo fazem um refresh só. |
| Sair | STY009. | Apaga o aparelho primeiro e avisa o servidor depois, mandando também o refresh token. Assim não trava sem internet. |
| Mock | — | Só liga em modo de desenvolvimento (`__DEV__`), nunca numa build de produção. |
| Backup do Android | ADR-23. | `allowBackup: false`, para o banco local não ir pro backup do Google. |
| Build | WatermelonDB 0.28 é de julho de 2025 e não diz que suporta RN 0.88. | Precisa de dev build (`npx expo run:android` ou EAS), não roda no Expo Go. **O build nativo ainda não foi testado.** |

## Login (protótipo 01, STY002, ADR-21)

| Assunto | Fontes | O que o app faz |
|---|---|---|
| E-mail ou CPF | Protótipo e mock da web: e-mail ou CPF. Requisitos: só e-mail. | Aceita os dois. |
| Mensagem de erro | STY002 RN01: genérica. | "E-mail, CPF ou senha incorretos." |
| Captcha | ADR-21: Turnstile depois de 3 erros. | O app mostra um aviso no `CAPTCHA_REQUIRED`. O Turnstile em webview não foi feito porque falta a site key. |
| Bloqueio | STY002 e ADR-21: 5 erros, 15 minutos. | Mostra os minutos do `Retry-After` e trava o botão. |
| 2FA | STY007: app ou e-mail. Mock da web: `method` APP ou EMAIL. | Pede o código de 6 números. |
| Refresh | A web usa cookie HttpOnly. | O app manda o `refreshToken` no corpo de `POST /auth/refresh`. **Proposta.** Se o refresh falhar, limpa o aparelho e volta pro login. |
| Outros botões | Protótipo: código temporário, Google, criar conta, explorar sem conta. | Aparecem, mas avisam que ainda não estão prontos. São de outras tarefas. |

## Perfil e segurança (052 a 054)

| Assunto | Fontes | O que o app faz |
|---|---|---|
| Nome de exibição | Web: 2 a 40, sem `@` nem 4 dígitos seguidos. Banco: `VARCHAR(120)`. | Segue a web. |
| Sobre você | Protótipo e web: 160. Nenhuma regra fala disso. | 160. |
| Região | Banco: `user_addresses.approx_neighborhood`. Protótipo: select. | Campo de texto, porque não existe a lista de bairros. |
| Senha | Protótipo: "Mínimo de 10 caracteres". Nenhuma regra dá o número. | Segue a web: 10 a 128, maiúscula, número e caractere especial. |
| Trocar senha | STY008: encerra as outras sessões. | Avisa na tela. |
| Sair | STY009: confirmação. O protótipo não mostra o botão. | "Sair da conta" no fim do perfil, com confirmação. |
| Encerrar uma sessão | Nenhuma regra. | Usa `DELETE /me/sessions/{id}` do mock da web. |
| Exclusão | STY010 RN02: saldo de moedas pede confirmação extra. ADR-07: recusa. | Segue a STY010. A rota é `/me/deletion` (web); o backend antigo usava `/solicitar-exclusao`. |
| QR do 2FA | STY007: QR e chave manual. | Mostra só a chave manual e o link `otpauth://`, porque o app não tem biblioteca de QR. |
| Moedas na exclusão | O contrato da web não tem campo para a confirmação extra. | O app manda `acknowledgeCoins: true` na segunda tentativa. **Proposta, precisa combinar com o backend.** |
| Abas | Protótipo: Início, Buscar, Anunciar, Chat e Perfil. | Início, Buscar e Chat são telas "em breve" (EDTS-415). |

## Outras divergências encontradas

- O `Prototipo_Alta_Fidelidade_Telas.md` liga as telas 052 a 054 aos casos STY052 a STY054, mas o certo é STY009 a STY011.
- A numeração dos RFs muda de um arquivo para outro.
- O protótipo mostra "iPhone 13", mas o projeto é só Android.
- ADR-23 e ADR-24 ainda estão como "Proposto".
- O banco não tem colunas de 2FA, sessões, `email_verified` nem `password_changed_at`.
- Nenhuma fonte define a validade dos tokens.

## Contas de teste do mock

Só existem no mock (`src/mock.ts`), não são contas reais: `teste@steely.dev` e `doisfatores@steely.dev` (código `123456`). A senha está no próprio mock.
