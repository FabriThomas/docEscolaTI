# Decisões da EDTS-381 (câmera e criar anúncio)

[← Mobile](README.md)

O que o app faz quando as fontes não batem ou não dizem nada. Cada linha pode mudar quando o grupo decidir.

## Onde foi pesquisado

- Jira EDTS-381.
- Requisitos e regras: [Requisitos_Steely.md](../01-planejamento/Requisitos_Steely.md), [Regras_de_Negocio.md](../01-planejamento/Regras_de_Negocio.md), [Especificacao_de_Casos_de_Uso.md](../01-planejamento/Especificacao_de_Casos_de_Uso.md).
- Arquivos originais (PDF, DOCX e XLSX convertidos para texto): `documento-de-requisitos-v2.docx`, `Regras_de_Negocio_Steely_v1.xlsx`, `Documento_de_Regras_de_Negocio.pdf` e `diagrama-de-estados-do-anuncio.pdf`, todos em [01-planejamento/originais](../01-planejamento/originais/).
- ADRs: [ADR-23](../02-adrs/md/ADR-23_Offline_First.md), [ADR-24](../02-adrs/md/ADR-24_Armazenamento_Seguro_no_Dispositivo.md) e [ADR-27](../02-adrs/md/ADR-27_Captura_e_Compressao_de_Imagem.md).
- Protótipos 002 a 006 e o [GUIA-DE-PROTOTIPOS.md](../docs/05-design/GUIA-DE-PROTOTIPOS.md).
- Banco: [migrations](../supabase/migrations/), da 0001 à 0005.
- Branches abertas dos colegas, sem merge: EDTS-374 (backend), com só `/health` e `/me`, e EDTS-379 (web), com rotas de login e perfil em mock.

## Fotos

| Assunto | Fontes | O que o app faz |
|---|---|---|
| Formato e tamanho | Jira: WebP, 1600 px, até 300 KB. ADR-27: JPEG, 1920 px, até 2 MB. | Segue o Jira: WebP, maior lado com 1600 px, até 300 KB. Se passar de 300 KB, tenta de novo com qualidade menor e lado menor. O bucket `offers-media` aceita WebP até 2 MB, então o banco não precisa mudar. **A ADR-27 precisa ser atualizada ou o Jira corrigido.** |
| Quantidade | RF-03: até 6. Rascunho antigo: 10. | 6 (`MAX_FOTOS`). |
| Nitidez | Jira: no aparelho. ADR-27: no servidor. | No aparelho, só uma checagem simples: proporção, resolução (lado menor ≥ 600 px) e luz (`BrightnessValue` do EXIF < -2). A nitidez de verdade, o ROI ≥ 15% e o LOW_QUALITY_RECAPTURE ficam no servidor. Os números 600 e -2 são provisórios. |
| Reordenar | Protótipo 003: "Arraste para reordenar". | Botões "Definir como capa", "Mover para antes" e "Mover para depois", porque arrastar não funciona com leitor de tela. |

## Detalhes

| Assunto | Fontes | O que o app faz |
|---|---|---|
| Estado de funcionamento | RF-05/RF-19: 5 estados. Banco: `condition` com NOVO, SEMINOVO, USADO e DEFEITO_SUCATA. | Mostra os 5 estados e manda `operationalState`. **Falta uma coluna no banco.** |
| Tipo de oferta | RF-05: Peça Avulsa ou PC Montado. Banco: PECA, MAQUINA e LOTE. | PECA e MAQUINA. Lote fica para outra tarefa. |
| Situação dos dados | RB-04: HDD, SSD, NVMe e PC montado. | É pedida quando a categoria é Armazenamento ou o tipo é PC Montado. |
| Risco químico | RB-02. | Bloqueia o avanço e indica um Ecoponto. |
| Tempo de uso | Nenhuma fonte traz a lista. | 3 opções provisórias. |
| Regras antigas | O rascunho citava `regras-de-negocio-v2.xlsx` (STY016 RN10, RN04 da foto do defeito), que não existe no repositório oficial. | As referências foram trocadas pelas regras oficiais: STY016 RN01 a RN06, STY017 RN01 a RN04, STY019 RN01 a RN06 e STYG. |

## Preço e revisão

| Assunto | Fontes | O que o app faz |
|---|---|---|
| Preço divergente | STY016 RN04: o preço divergente pede confirmação, mas a regra não diz contra o quê comparar. | Compara com o meio da faixa de referência. Se a diferença for de 50% ou mais, pede "Corrigir preço" ou "Manter preço". |
| Moedas | RB-08: Scanner ≥ 80%. O protótipo mostra "+20", mas nenhuma fonte dá o número. | Mostra o aviso sem número, só quando o Scanner foi AUTO com confiança ≥ 0,8 ou quando a pessoa escolheu uma opção do Top-3. Preenchimento manual não ganha moedas. |
| Declaração | O protótipo mostra a caixa já marcada. | Começa desmarcada, e "Publicar anúncio" só libera depois que a pessoa marca. |
| Depois de publicar | O protótipo volta para a Home, que é de outra tarefa. | Aviso e "Meus anúncios". |

## Meus anúncios e editar (007 a 010)

Não têm protótipo (o GUIA marca "a fazer"). Seguem STY019, STYG e o diagrama de estados.

- **Status:** o banco não tem EM_TRIAGEM, EXPIRADA, CANCELADA, `version` nem `paused_at`. O app usa esses campos porque o diagrama de estados usa.
- **Pausa e reabertura:** pausar é bloqueado com encontro agendado ou leilão (RN01). Removido pela moderação não reabre (RN04). Reabrir volta para a triagem (RN05). Depois de 30 dias aparece "Criar novo com estes dados" (RN06).
- **Edição:** manda `version`. Se der conflito, mostra "Ver versão atual" (STYG RN07).

## Rotas que o app espera

O backend ainda não tem essas rotas. Enquanto isso o app usa o mock (`src/mock.ts`, ligado por `EXPO_PUBLIC_USAR_MOCK`). O mock segue o padrão da API: `/api/v1`, camelCase, `priceCents` e erros RFC 9457 com `code`.

| Método | Rota | Uso |
|---|---|---|
| POST | `/media` | Envia uma foto e devolve `mediaId`. |
| POST | `/scanner/analyze` | `{mediaIds}` → `decisionBand`, `confidence` e sugestões. |
| GET | `/offers/price-reference?category=&title=` | `{minCents, maxCents}`. |
| POST | `/offers` | Cria o anúncio. Erros: OFFER_LIMIT_REACHED e PII_OR_CONTACT_DETECTED. |
| GET | `/offers/me` | Lista os anúncios do vendedor. |
| GET e PATCH | `/offers/{id}` | Lê e edita, com `version`. Erro: OFFER_VERSION_CONFLICT. |
| POST | `/offers/{id}/pause`, `/reactivate` e `/cancel` | STY019 e STYG. |

## Revisão do ECC (react-reviewer)

Corrigido, com teste: a câmera passava de 6 fotos; erro no envio da foto aparecia como "Sem conexão"; o mock ficava ligado sem a variável (agora só liga com `EXPO_PUBLIC_USAR_MOCK=sim`); moedas e Scanner ficavam valendo depois de trocar as fotos ou rodar o Scanner de novo; a revisão aceitava rascunho incompleto ou com risco químico; mínimo digitado errado sumia sem aviso; foto do defeito entrava depois de escolher "Funciona".

## Fica para depois

- Dois toques rápidos em "Continuar" podem empilhar a mesma tela duas vezes, e a lista pode receber respostas fora de ordem ao recarregar. Não aparecem no uso normal.
- Se a resposta do `POST /offers` se perder, tentar de novo cria outro anúncio. Isso se resolve com `Idempotency-Key` no backend (ADR-14).

- As fotos sobem para `/media` duas vezes: uma no Scanner e outra na publicação. Com a API real isso vira mídia duplicada. A correção é guardar o `mediaId` na foto.
- O banco não aceita mídia antes de a oferta existir (`offer_media.offer_id` é NOT NULL). O backend vai precisar de upload temporário ou mudar essa coluna.
- A URL da API vem de `EXPO_PUBLIC_API_URL`. Em produção precisa ser `https`.
