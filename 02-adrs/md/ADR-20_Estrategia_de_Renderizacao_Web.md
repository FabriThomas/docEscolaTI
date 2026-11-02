# ADR-20 — Acessibilidade e responsividade
**Architecture Decision Record · Projeto Steely · Escola de TI · UniCesumar**

| Campo | Valor | Campo | Valor |
| --- | --- | --- | --- |
| **Status** | ☒ Proposto ☐ Aceito ☐ Rejeitado ☐ Substituído pelo ADR-___ | **Data** | 31/10/2026 |
| **Responsável** | Pietro Pasqual Silva | **Sprint** | 8–9 / 15–17 (Entrega até 23/11/2026) |
| **Participantes** | Fabrício Notoya Thomas, Augusto Palma Guglielmi, Thiago Lopes Martins, Pietro Pasqual Silva, Rafael Tudela Rizental | | |
| **Vínculos** | RNF-10 · ADR-17 · ADR-19 · ADR-22 | | |

## 1. Contexto *(obrigatória)*

O RNF-10 exige que a interface se adapte de 360 px a 2560 px, obtenha nota ≥ 90 no Google Lighthouse e siga a WCAG 2.1 nível AA. Sem
um padrão definido, cada tela trata layout e acessibilidade de um jeito, e os problemas só aparecem no fim.
O projeto também atende ONGs e escolas (Mural de Doações) e usuários em celulares simples. Restrições: prazo 23/11/2026, custo zero e
nenhum especialista em acessibilidade na equipe.

## 2. Direcionadores da decisão *(recomendada)*

Cumprir o RNF-10 de forma verificável, com números.
Acessibilidade embutida nos componentes, não corrigida tela a tela.
Ferramentas gratuitas e automatizáveis no CI.
Nota de Lighthouse fácil de mostrar na defesa.
Não aumentar o bundle a ponto de derrubar a performance.

## 3. Opções consideradas *(obrigatória)*

| Opção A — Mobile-first + Radix UI + testes automáticos | Opção B — Biblioteca completa (MUI) | Opção C — Auditoria manual no fim |
| --- | --- | --- |
| Descrição<br>CSS mobile-first com breakpoints fixos;<br>componentes interativos sobre primitivas<br>acessíveis (Radix UI); axe e Lighthouse CI a<br>cada pull request.<br>Prós<br>Foco, teclado e ARIA prontos em modal,<br>menu e abas<br>Visual livre, usando os tokens do ADR-19<br>Regressões barradas no CI<br>Bundle pequeno<br>Contras<br>Exige estilizar os componentes<br>Configuração inicial do CI | Descrição<br>Usar MUI no web, que já traz componentes<br>com ARIA e grid responsivo.<br>Prós<br>Muitos componentes prontos<br>Boa acessibilidade padrão<br>Contras<br>Bundle maior, que pesa no Lighthouse<br>Visual Material difícil de alinhar ao Figma<br>Não serve ao mobile | Descrição<br>Desenvolver normalmente e rodar Lighthouse e<br>correções antes da entrega.<br>Prós<br>Nenhum esforço agora<br>Contras<br>Retrabalho alto perto do prazo<br>Risco real de não atingir ≥ 90<br>Nada impede regressões |

## 4. Decisão *(obrigatória)*

| Item | Regra |
| --- | --- |
| Breakpoints | 360 (base), 768, 1024, 1440 e 2560 px; conteúdo limitado a 1440 px e centralizado acima disso |
| Unidades | rem para texto e espaço; Flexbox/Grid; sem largura fixa em px |
| Contraste | Texto ≥ 4,5:1; texto grande e ícones ≥ 3:1 (garantido nos tokens do ADR-19) |
| Teclado | Toda ação alcançável por Tab; foco visível; link "pular para o conteúdo" |
| Semântica | HTML semântico, lang="pt-BR", rótulo em todo campo, alt em toda imagem |
| Toque e<br>movimento | Área mínima de 44 × 44 px; respeitar prefers-reduced-motion |
| Gráficos | Resumo em texto ou tabela alternativa (ADR-22) |
| SEO na SPA<br>(Vite) | Título e meta description por rota e robots.txt, para manter SEO ≥ 90 sem SSR (ADR-18) |
| App Android | Radix UI e Lighthouse valem só para o web; no app, accessibilityLabel e accessibilityRole em todo elemento interativo<br>e teste com TalkBack |

## 5. Consequências *(obrigatória)*

Positivas
RNF-10 vira critério automático de aceite no CI.
Componentes acessíveis reaproveitados em todas as telas.
Melhor uso em celulares simples, boa parte do público.
Negativas ou riscos aceitos
Pull requests podem ser barrados por nota abaixo de 90, exigindo ajuste antes do merge.
Testes automáticos pegam cerca de metade dos problemas; leitor de tela ainda exige teste manual nos fluxos principais.
O que muda
Código: @radix-ui/* nos componentes interativos; eslint-plugin-jsx-a11y; testes com axe-core; lighthouserc.json com limite 0,9
nas quatro categorias.
CI (ADR-17): Lighthouse CI + axe em todo PR, rodando sobre o preview da Cloudflare Pages, nas páginas home, busca, oferta, login e
dashboard ESG; Playwright nos fluxos ponta a ponta do web; cobertura das telas ≥ 60%.
Protótipos: telas do Figma desenhadas em 360, 768 e 1440 px.

## 6. Validação *(recomendada)*

Lighthouse ≥ 90 em Performance, Acessibilidade, Boas práticas e SEO nas 5 páginas principais (mobile e desktop).
axe sem violações críticas ou sérias; sem rolagem horizontal em 360, 768, 1024, 1440 e 2560 px.
Login, busca e publicação de oferta concluídos só com teclado e com leitor de tela (NVDA ou TalkBack).

## 7. Plano de implementação *(recomendada)*

| Tarefa | Responsável | Sprint |
| --- | --- | --- |
| Definir breakpoints e container base no CSS | A definir | A definir |
| Criar componentes base sobre Radix UI (botão, modal, menu, abas, formulário) | A definir | A definir |
| Configurar jsx-a11y, axe e Lighthouse CI | A definir | A definir |
| Revisar telas existentes nos 5 breakpoints | A definir | A definir |
| Teste manual com teclado e leitor de tela | A definir | A definir |

## 8. Referências *(recomendada)*

WCAG 2.1 — w3.org/TR/WCAG21
Lighthouse CI — github.com/GoogleChrome/lighthouse-ci
Radix UI — radix-ui.com (Accessibility)
axe-core — github.com/dequelabs/axe-core
ADR-17 (estratégia de testes), ADR-19 (tokens e contraste), ADR-22 (gráficos acessíveis)

## Histórico de revisões

| Versão | Data | Autor | Alteração |
| --- | --- | --- | --- |
| 1.0 | 31/10/2026 | Pietro Pasqual Silva | Criação do ADR |
| 1.1 | 31/10/2026 | Pietro Pasqual Silva | Alinhamento com as decisões do grupo (FastAPI, Supabase, pg_cron) |
| 1.2 | 31/10/2026 | Pietro Pasqual Silva | Fechamento dos conflitos do alinhamento (Vite, snapshot OpenAPI, RFC 9457,<br>RLS no FastAPI) |
| 1.5 | 31/10/2026 | Pietro Pasqual Silva | Alinhamento com os ADR-13 a 17 (codes, camelCase, schema private,<br>Idempotency-Key, tela do leilão) |
| 1.6 | 01/11/2026 | Revisão cruzada do grupo | Padronização do nome 'Fabrício' nos participantes, conforme a revisão cruzada. |

## ADENDO — ADR-20 · Acessibilidade e responsividade

Projeto Steely · Alinhamento final (propostas do Augusto aceitas). Itens do grupo aplicados a este documento.

Cronograma (item 18)

- Janela de entrega (item 18): Sprints 8–9 / 15–17, até 23/11/2026.

- O campo Sprint do cabeçalho passa a registrar essa janela.

Histórico: versão 1.7 — aplicação dos itens 12, 13, 18 e 19 do alinhamento final do grupo. Este adendo registra as decisões de negócio do

grupo que afetam este ADR; o texto das seções 1 a 8 permanece como na versão anterior.
