# ADR-19 — Design system compartilhado
**Architecture Decision Record · Projeto Steely · Escola de TI · UniCesumar**

| Campo | Valor | Campo | Valor |
| --- | --- | --- | --- |
| **Status** | ☒ Proposto ☐ Aceito ☐ Rejeitado ☐ Substituído pelo ADR-___ | **Data** | 31/10/2026 |
| **Responsável** | Pietro Pasqual Silva | **Sprint** | 8–9 / 15–17 (Entrega até 23/11/2026) |
| **Participantes** | Fabrício Notoya Thomas, Augusto Palma Guglielmi, Thiago Lopes Martins, Pietro Pasqual Silva, Rafael Tudela Rizental | | |
| **Vínculos** | EDTS-72 · SPRINT8_010 · RNF-10 · ADR-17 · ADR-18 · ADR-20 | | |

## 1. Contexto *(obrigatória)*

A Steely tem duas interfaces, web (React) e Android (React Native/Expo), desenhadas no Figma. Sem uma fonte única, cores, fontes e
espaçamentos são copiados à mão para cada plataforma e divergem a cada ajuste de layout.
É preciso decidir agora porque as telas finais estão sendo implementadas e o contraste das cores entra na meta de acessibilidade (ADR-20).
Restrições: custo zero, prazo 23/11/2026 e equipe de 5 pessoas.

## 2. Direcionadores da decisão *(recomendada)*

Uma única fonte de verdade: o Figma.
Mesmos valores no web e no mobile, sem cópia manual.
Contraste mínimo WCAG AA garantido já nos tokens.
Ferramentas gratuitas e processo que a equipe consiga repetir.
Fácil de demonstrar na defesa (mudar um token e ver as duas plataformas mudarem).

## 3. Opções consideradas *(obrigatória)*

| Opção A — Figma Variables + Style Dictionary | Opção B — Valores copiados por plataforma | Opção C — Tema de biblioteca pronta (MUI / NativeBase) |
| --- | --- | --- |
| Descrição<br>Tokens criados como Variables no Figma e<br>exportados em JSON (formato W3C DTCG). O<br>Style Dictionary gera CSS variables para o web<br>e um objeto TypeScript para o app (React<br>Native/Expo).<br>Prós<br>Fonte única e geração automática<br>Tokens versionados no Git<br>Ferramentas gratuitas<br>Suporta tema claro e escuro<br>Contras<br>Exige configurar o pipeline<br>Nomes de tokens precisam de disciplina | Descrição<br>Cada dev lê o Figma e escreve cores e<br>tamanhos no CSS do web e no StyleSheet do<br>mobile.<br>Prós<br>Zero configuração<br>Começa na hora<br>Contras<br>Divergência certa entre plataformas<br>Retrabalho a cada mudança<br>Nada garante o contraste | Descrição<br>Adotar o tema de uma biblioteca de<br>componentes e configurar as cores do Figma<br>nela.<br>Prós<br>Componentes prontos<br>Tema centralizado em cada plataforma<br>Contras<br>Bibliotecas e temas separados no web e no<br>mobile<br>Visual genérico<br>Aumenta o bundle |

## 4. Decisão *(obrigatória)*

| Nível | Exemplo | Uso |
| --- | --- | --- |
| Primitivo | color.green.600, space.4 (16 px) | Paleta bruta; nunca usada direto nas telas |
| Semântico | color.text.primary, color.bg.surface | O que as telas usam; muda no tema escuro |
| Componente | button.primary.bg, card.radius | Ajustes finos de componentes |

## 5. Consequências *(obrigatória)*

Positivas
Uma mudança no Figma chega ao web e ao mobile com um comando (npm run tokens).
Contraste validado uma vez, no token, e não em cada tela.
Tema escuro passa a ser troca de tokens semânticos.
Negativas ou riscos aceitos
Configuração inicial do pipeline (estimada em 1 a 2 dias).
A exportação do Figma pode exigir plugin (ex.: Tokens Studio) se a API de Variables não estiver disponível no plano gratuito.
O que muda
Código: pacote packages/tokens com tokens.json, configuração do Style Dictionary e saídas tokens.css (importado no Vite, ADR-18)
e tokens.ts (app Expo).
Proibido usar cor ou tamanho fixo (hex, px soltos) nos componentes; regra de lint aponta o uso.
Diagramas: o diagrama de componentes ganha o pacote tokens como dependência do web e do mobile.

## 6. Validação *(recomendada)*

Alterar color.brand.primary no Figma, exportar, rodar o build e ver a cor mudar no web e no Android.
Script de contraste aprova todos os pares texto/fundo semânticos com razão ≥ 4,5:1, rodando em todo PR no CI do ADR-17.
O CI falha se tokens.json mudar e as saídas geradas não forem atualizadas no mesmo PR.
Busca no código não encontra cores hex fora do pacote tokens.

## 7. Plano de implementação *(recomendada)*

| Tarefa | Responsável | Sprint |
| --- | --- | --- |
| Criar coleções de Variables no Figma (primitivo, semântico, componente) | A definir | Sprint 8 |
| Exportar JSON e configurar Style Dictionary (SPRINT8_010) | A definir | Sprint 8 |
| Aplicar tokens nos componentes base do web e do mobile (EDTS-72) | A definir | Sprint 8 |
| Script de contraste, regra de lint e checagem no CI do ADR-17 | A definir | A definir |

## 8. Referências *(recomendada)*

Style Dictionary — styledictionary.com
W3C Design Tokens Format Module — designtokens.org
Figma — Guide to variables (help.figma.com)
ADR-17 (testes e CI), ADR-18 (front em Vite), ADR-20 (contraste e acessibilidade)

## Histórico de revisões

| Versão | Data | Autor | Alteração |
| --- | --- | --- | --- |
| 1.0 | 31/10/2026 | Pietro Pasqual Silva | Criação do ADR |
| 1.1 | 31/10/2026 | Pietro Pasqual Silva | Alinhamento com as decisões do grupo (FastAPI, Supabase, pg_cron) |
| 1.2 | 31/10/2026 | Pietro Pasqual Silva | Verificações de tokens e contraste no CI do ADR-17; Vite; vínculo corrigido |
| 1.3 | 01/11/2026 | Revisão cruzada do grupo | Padronização do nome 'Fabrício' nos participantes, conforme a revisão cruzada. |

## ADENDO — ADR-19 · Design system compartilhado

Projeto Steely · Alinhamento final (propostas do Augusto aceitas). Itens do grupo aplicados a este documento.

Cronograma (item 18)

- Janela de entrega (item 18): Sprints 8–9 / 15–17, até 23/11/2026.

- As tarefas do plano (seção 7) seguem na janela acima; o campo Sprint do cabeçalho passa a registrar essa janela.

Histórico: versão 1.4 — aplicação dos itens 12, 13, 18 e 19 do alinhamento final do grupo. Este adendo registra as decisões de negócio do

grupo que afetam este ADR; o texto das seções 1 a 8 permanece como na versão anterior.
