# ADR-21 — Provedor de captcha
**Architecture Decision Record · Projeto Steely · Escola de TI · UniCesumar**

| Campo | Valor | Campo | Valor |
| --- | --- | --- | --- |
| **Status** | ☒ Proposto ☐ Aceito ☐ Rejeitado ☐ Substituído pelo ADR-___ | **Data** | 31/10/2026 |
| **Responsável** | Pietro Pasqual Silva | **Sprint** | 8–9 / 15–17 (Entrega até 23/11/2026) |
| **Participantes** | Fabrício Notoya Thomas, Augusto Palma Guglielmi, Thiago Lopes Martins, Pietro Pasqual Silva, Rafael Tudela Rizental | | |
| **Vínculos** | STY004 · STY002 · RNF-13 · RNF-01 · RF-01 · ADR-05 · ADR-09 · ADR-13 · ADR-17 | | |

## 1. Contexto *(obrigatória)*

O STY004 exige captcha em operações sensíveis (login, cadastro, compra e formulários) e bloqueio temporário da origem após 3 falhas
consecutivas no captcha. O STY002 diz que, após 3 tentativas de login malsucedidas, o captcha passa a ser obrigatório; após 5, a conta é
bloqueada temporariamente e o titular avisado por e-mail. Se o provedor cair, deve haver um desafio alternativo interno.
Pelo ADR-09, a autenticação é do Supabase Auth (JWT), mas todo fluxo HTTP, inclusive login, cadastro e recuperação, passa
obrigatoriamente pelo FastAPI; o cliente não chama o Supabase Auth direto. O captcha nativo do Supabase Auth exige captcha em toda
tentativa, o que não permite a regra das 3 falhas. O RNF-13 limita as rotas de autenticação a 5 tentativas a cada 5 minutos. Restrições: custo
zero, LGPD, web e Android, prazo 23/11/2026.
O Hardware Captcha (RF-16) não é objeto deste ADR; ele só é reaproveitado como fallback.

## 2. Direcionadores da decisão *(recomendada)*

Segurança contra força bruta e automação.
Cumprir a regra das 3 falhas do STY002 e do STY004.
Privacidade e LGPD: mínimo de dados pessoais enviados a terceiros.
Custo zero, pouca fricção e acessibilidade (ADR-20).
Funcionar no web e no app (Expo).
Fácil de demonstrar: errar a senha 3 vezes e ver o captcha surgir.

## 3. Opções consideradas *(obrigatória)*

| Opção A — Cloudflare Turnstile | Opção B — Google reCAPTCHA (v2/v3) | Opção C — hCaptcha |
| --- | --- | --- |
| Descrição<br>Captcha geralmente invisível; o navegador<br>resolve desafios em segundo plano e o<br>backend valida o token na API siteverify.<br>Prós<br>Gratuito<br>Não depende de cookies de rastreamento<br>nem de conta Google<br>Quase sem fricção e acessível<br>Validação simples no FastAPI<br>Contras<br>No app exige WebView<br>Menos controle sobre o tipo de desafio | Descrição<br>Serviço do Google: v2 com caixa "não sou um<br>robô" e imagens; v3 invisível com nota de risco.<br>Prós<br>Muito conhecido e documentado<br>v3 dá nota de risco por ação<br>Contras<br>Coleta de dados para o Google pesa na<br>LGPD<br>Plano gratuito com limite mensal<br>Não é suportado pelo captcha nativo do<br>Supabase Auth | Descrição<br>Captcha de imagens com foco em privacidade,<br>alternativa direta ao reCAPTCHA.<br>Prós<br>Bom para privacidade<br>Plano gratuito<br>Suportado pelo Supabase Auth<br>Contras<br>Desafios de imagem frequentes geram<br>fricção<br>Barreiras de acessibilidade |

## 4. Decisão *(obrigatória)*

| Falhas na janela | Comportamento no login |
| --- | --- |
| 0 a 2 | Login normal, sem captcha; mensagem genérica de erro |
| 3 ou 4 | Captcha obrigatório; sem token válido o FastAPI responde 403 com code CAPTCHA_REQUIRED (RFC 9457, ADR-13) |
| 5 | Bloqueio temporário da conta (15 min): 429 com code LOGIN_LOCKED e Retry-After; e-mail ao titular |

## 5. Consequências *(obrigatória)*

Positivas
Usuário legítimo quase nunca vê captcha; robôs são barrados a partir da 3ª tentativa.
Sem atalho: como o cliente não fala direto com o Supabase Auth, o contador não pode ser contornado.
Regra de negócio fica no FastAPI, como define o ADR-09, e testável com pytest.
O fallback reaproveita o banco de imagens do Hardware Captcha.
Negativas ou riscos aceitos
Dependência do Turnstile; mitigada pelo fallback interno.
O slowapi conta na memória de cada processo e não segura ataque volumétrico L7; essa parte do RNF-13 fica com o proxy e o WAF da
Cloudflare na frente do Render (ADR-13).
Um atacante pode bloquear a conta de alguém errando a senha 5 vezes; aceito porque o bloqueio é curto e o titular é avisado.
A Política de Privacidade precisa citar a Cloudflare como operadora.
O que muda
Backend: router auth no FastAPI, dependência verify_turnstile e chamada ao Supabase Auth; erros no padrão RFC 9457 (ADR-13).
Banco: tabela auth_login_attempts (email, ip, falhas, captcha_falhas, bloqueado_ate).
Web: componente <Captcha> exibido quando a API responder CAPTCHA_REQUIRED; em LOGIN_LOCKED, a tela mostra o tempo do Retry-
After. App: o mesmo widget em react-native-webview.
Ambiente: TURNSTILE_SITE_KEY e TURNSTILE_SECRET_KEY. Diagramas: sequência do login cliente → FastAPI → Turnstile → Supabase
Auth.

## 6. Validação *(recomendada)*

Como saber se a decisão deu certo? Teste, critério de aceite, métrica ou demonstração que comprova.

## 7. Plano de implementação *(recomendada)*

| Tarefa | Responsável | Sprint |
| --- | --- | --- |
| Criar site no painel da Cloudflare e configurar chaves | A definir | A definir |
| Router auth no FastAPI, verify_turnstile e tabela auth_login_attempts | A definir | A definir |
| Componente <Captcha> no web e WebView no app | A definir | A definir |
| Fallback com imagens de controle do Hardware Captcha | A definir | A definir |
| Testes pytest dos fluxos de 3 e 5 falhas; atualizar Política de Privacidade | A definir | A definir |

## 8. Referências *(recomendada)*

Cloudflare Turnstile — developers.cloudflare.com/turnstile
Turnstile — Server-side validation (documentação Cloudflare)
Supabase Auth — Enable captcha protection (supabase.com/docs)
OWASP — Authentication Cheat Sheet
RFC 9457 — Problem Details for HTTP APIs
STY002, STY004, RNF-13; ADR-05 (logs), ADR-09 (auth e rate limiting), ADR-13 (erros), ADR-17 (testes)

## Histórico de revisões

| Versão | Data | Autor | Alteração |
| --- | --- | --- | --- |
| 1.0 | 31/10/2026 | Pietro Pasqual Silva | Criação do ADR |
| 1.1 | 31/10/2026 | Pietro Pasqual Silva | Alinhamento com as decisões do grupo (FastAPI, Supabase, pg_cron) |
| 1.2 | 31/10/2026 | Pietro Pasqual Silva | Fechamento dos conflitos do alinhamento (Vite, snapshot OpenAPI, RFC 9457,<br>RLS no FastAPI) |
| 1.3 | 31/10/2026 | Pietro Pasqual Silva | Segundo alinhamento: limites do Realtime, slowapi, SECURITY DEFINER e<br>sessão RLS |
| 1.5 | 31/10/2026 | Pietro Pasqual Silva | Alinhamento com os ADR-13 a 17 (codes, camelCase, schema private,<br>Idempotency-Key, tela do leilão) |
| 1.6 | 01/11/2026 | Revisão cruzada do grupo | Padronização do nome 'Fabrício' nos participantes, conforme a revisão cruzada. |

## ADENDO — ADR-21 · Provedor de captcha

Projeto Steely · Alinhamento final (propostas do Augusto aceitas). Itens do grupo aplicados a este documento.

Cronograma (item 18)

- Janela de entrega (item 18): Sprints 8–9 / 15–17, até 23/11/2026.

- O campo Sprint do cabeçalho passa a registrar essa janela.

Histórico: versão 1.7 — aplicação dos itens 12, 13, 18 e 19 do alinhamento final do grupo. Este adendo registra as decisões de negócio do

grupo que afetam este ADR; o texto das seções 1 a 8 permanece como na versão anterior.
