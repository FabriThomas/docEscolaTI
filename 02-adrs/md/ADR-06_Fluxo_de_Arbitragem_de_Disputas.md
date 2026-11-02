# ADR-06 — Critérios de arbitragem
**Architecture Decision Record · Projeto Steely · Escola de TI · UniCesumar**

| Campo | Valor | Campo | Valor |
| --- | --- | --- | --- |
| **Status** | ☒ Proposto ☐ Aceito ☐ Rejeitado ☐ Substituído pelo ADR-___ | **Data** | 01/11/2026 |
| **Responsável** | Augusto Palma Guglielmi | **Sprint** | Entrega até 23/11 (Sprints 15 a 17) |
| **Participantes** | Augusto Palma Guglielmi, Fabrício Notoya Thomas, Pietro Pasqual Silva, Rafael Tudela Rizental, Thiago Lopes Martins | | |
| **Vínculos** | R-04 (Matriz GUT) · RF-13 e RF-20 · STY031, STY033, STY034, STY035 e STY050 · PRM-29 a PRM-34 · RNF-09 · ADR-03, ADR-05, ADR- 09, ADR-12, ADR-16 e ADR-25 | | |

## 1. Contexto

Quando o comprador pede devolução ou abre reclamação (RF-13), alguém precisa decidir se o valor retido volta ao comprador ou vai ao vendedor. O
risco R-04 (pontuação 80) é exatamente decidir sem critério objetivo. As regras de negócio já pedem uma rubrica escrita (STY035-RN02), evidências
obrigatórias (STY031-RN03), critério de divergência pelo número de série (STY031-RN06) e dupla aprovação para estorno.
Prazos já definidos: 7 dias de garantia (PRM-29); 3 dias para o vendedor responder (PRM-30); 3 dias de mediação direta (PRM-31); 5 dias para a defesa
(PRM-32); 10 dias para pedir escalamento (PRM-33); 2 níveis de atendimento (PRM-34).
Já definido pelo grupo: o ADR-16 escala à arbitragem ou defere ao comprador quando vencem os 3 dias; o ADR-09 exige um segundo moderador no
estorno e no banimento definitivo (STY035-RN03 e STY050-RN03); o ADR-03 bloqueia a liberação do escrow enquanto houver devolução, laudo em
análise ou disputa. Falta fixar quais critérios decidem e quando um humano precisa decidir.

## 2. Direcionadores da decisão

Objetividade (R-04): a mesma situação deve levar à mesma decisão, com motivo registrado.
Proteção do dinheiro: estorno só com dupla aprovação.
Prazos curtos: a decisão não pode travar a custódia por tempo indefinido.
Escalabilidade: a regra automática alivia o moderador onde o fato é objetivo.
Auditoria e recurso: toda decisão com evidências e direito de escalamento (RF-13).
Esforço até 23/11: rubrica simples e implementável em regras.

## 3. Opções consideradas

| Opção A — Rubrica objetiva em dois níveis | Opção B — Tudo decidido por moderador | Opção C — Decisão automática por pontuação |
| --- | --- | --- |
| Descrição: regras automáticas só para fatos<br>objetivos, moderador humano para o julgamento<br>e segundo moderador no recurso e no estorno.<br>Prós:<br>Objetiva onde há fato objetivo<br>Dupla aprovação cobre o R-04<br>Segue os prazos e níveis já definidos<br>Auditável<br>Contras:<br>Depende de moderadores disponíveis<br>Exige manter a rubrica e os prazos<br>configuráveis | Descrição: todo caso é julgado por um humano,<br>sem regras automáticas.<br>Prós:<br>Flexível<br>Simples de entender<br>Contras:<br>Lento e caro<br>Casos com fato objetivo (serial, revelia)<br>sobrecarregam a fila<br>Subjetividade maior (R-04) | Descrição: um modelo ou pontuação decide<br>sem humano.<br>Prós:<br>Rápido<br>Sem fila de moderação<br>Contras:<br>Sem critério explicável para o usuário<br>Risco jurídico e de fraude<br>Conflita com a dupla aprovação (R-04) |

## 4. Decisão

| Critério objetivo | Como é verificado | Efeito |
| --- | --- | --- |
| 1. Número de série diverge do<br>registrado na pré-venda (STY031-<br>RN06) | Comparação automática do número de série informado com o do<br>anúncio | Forte indício a favor do comprador;<br>segue para decisão com ele<br>destacado |
| 2. Evidências obrigatórias completas<br>(STY031-RN03) | Relato, vídeo e número de série presentes | Sem as três, o pedido volta ao<br>comprador para complementar; não é<br>decidido |
| 3. Prazo da garantia (PRM-29) | Pedido dentro de 7 dias da entrega | Fora do prazo, é indeferido de forma<br>automática |
| 4. Coerência com o anúncio | Descrição, fotos e laudo do Scanner (ADR-12) confrontados com o vídeo | Avaliada pelo moderador, com registro<br>do motivo |
| 5. Resposta do vendedor (PRM-30 e<br>PRM-32) | Prazos de resposta e de defesa vencidos ou não | Sem resposta em 3 dias, defere ao<br>comprador por revelia (ADR-16) |

| Situação | Quem decide | Efeito no escrow (ADR-03) |
| --- | --- | --- |
| Pedido fora do prazo ou sem<br>evidências obrigatórias | Regra automática | Escrow segue o prazo normal |
| Vendedor sem resposta em 3 dias<br>(revelia) | Regra automática, auditada, com direito a escalamento | Estorno ao comprador |
| Serial divergente ou evidências<br>conflitantes, em primeiro nível | Moderador de nível 1 | Estorno ou liberação conforme a<br>decisão |
| Estorno por decisão de moderador | Dois moderadores distintos (R-04) | estornar_escrow só executa com<br>as duas aprovações |
| Escalamento pedido em até 10 dias<br>(STY034, PRM-33) | Moderador de nível 2, diferente do nível 1 | Mantém ou reverte a decisão |

## 5. Consequências

Positivas:
Decisões previsíveis, explicáveis e com trilha completa.
Estorno nunca depende de uma única pessoa.
Casos óbvios saem da fila do moderador.
Negativas ou riscos aceitos:
Depende de dois moderadores disponíveis; sem eles o estorno fica parado e o escrow, bloqueado.
A revelia pode ser usada por comprador de má-fé; o direito de escalamento e a reincidência mitigam.
A rubrica pode precisar de ajuste após os primeiros casos.
O que muda:
Banco: tabelas de reclamação, decisão e aprovação, com restrição de aprovadores distintos.
Código: serviço de regras da rubrica, fila do moderador e chamada de estornar_escrow (ADR-03).
Diagramas: BPMN P5b e diagrama de estados da reclamação passam a mostrar os dois níveis.

## 6. Validação

| # | Cenário de teste | Resultado esperado |
| --- | --- | --- |
| 1 | Devolução com serial divergente e evidências completas | Vai ao moderador com o critério 1 destacado |
| 2 | Pedido sem vídeo ou número de série | Volta ao comprador para complementar |
| 3 | Pedido no 8º dia após a entrega | Indeferido automaticamente |
| 4 | Vendedor sem resposta em 3 dias | Estorno por revelia, auditado, com prazo de 10 dias para escalar |
| 5 | Estorno aprovado por um só moderador | estornar_escrow recusa |
| 6 | O mesmo moderador tenta ser o segundo aprovador | Recusado (aprovadores distintos) |
| 7 | Disputa de valor acima do limite parametrizado | Decisão humana obrigatória, mesmo sem outros critérios |
| 8 | Reclamação aberta com custódia vencendo | Liberação do escrow bloqueada até a decisão |

## 7. Plano de implementação

| # | Tarefa | Responsável (proposta) | Sprint (proposta) |
| --- | --- | --- | --- |
| 1 | Modelo de reclamação, decisão e dupla aprovação | Fabrício e Augusto | 16 |
| 2 | Regras da rubrica e prazos em app_config | Augusto | 16 |
| 3 | Varredura de 3 dias e integração com o escrow (ADR-16) | Thiago | 16 |
| 4 | Fila e telas do moderador e do usuário | Pietro | 17 |
| 5 | Notificações de prazo e decisão (ADR-25) | Rafael e Thiago | 17 |
| 6 | Testes dos cenários da validação | Augusto e Thiago | 17 |

## 8. Referências

Matriz GUT (R-04), regras de negócio STY031, STY033–STY035 e STY050; PRM-29 a PRM-34; BPMN P5b.
ADR-03 (escrow), ADR-05 (logs), ADR-09 (segundo moderador), ADR-12 (Scanner), ADR-16 (varreduras) e ADR-25 (notificações).
CDC art. 49 e Decreto 7.962/2013. Modelo MADR: adr.github.io/madr.

## Histórico de revisões

| Versão | Data | Autor | Alteração |
| --- | --- | --- | --- |
| 1.0 | 01/11/2026 | Augusto Palma Guglielmi | Versão inicial, em status Proposto |
| 1.1 | 01/11/2026 | Augusto Palma Guglielmi | Alinhamento final do grupo: limite de R$ 500,00, 72 h para o moderador, mínimo de 2<br>moderadores e revelia mantida |
