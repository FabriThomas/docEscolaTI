# 🤖 Steely — Scanner IA: Roadmap de Engenharia e Métricas Reais (`Sprints 12 → 16`)

> **Épico no Jira:** `EDTS-325 — Scanner` (Cor: 🟠 `orange`)  
> **Responsável Técnico:** Fabrício Notoya Thomas  
> **ADRs de Referência:** [`ADR-01 (Motor do Scanner IA)`](../02-adrs/md/ADR-01_Motor_do_Scanner_IA.md) · [`ADR-02 (Censura Anti-Fuga de PII)`](../02-adrs/md/ADR-02_Censura_de_Dados_Pessoais_e_Contatos.md) · [`ADR-11 (Armazenamento e Sanitização de Imagens)`](../02-adrs/md/ADR-11_Armazenamento_de_Imagens.md) · [`ADR-12 (Limiares de Confiança do Scanner)`](../02-adrs/md/ADR-12_Limiar_de_Confianca_do_Scanner.md)

---

## 1. Etapa 1/4 — O que já foi entregue na `Sprint 12` (`EDTS-204`)

A **Etapa 1/4 (`EDTS-204: SPRINT12_005 - [SCANNER] Pipeline de Dataset & Auto-Anotação (VLM)`)** entregou a **infraestrutura completa de coleta, sanitização, deduplicação e anotação automática por VLM** (`scraping → limpeza → rotulagem estruturada V4 → geração de crops`):

### 1.1 Pipeline de Coleta, Sanitização e Deduplicação
| Componente Entregue | Detalhamento Técnico |
| :--- | :--- |
| **Scrapers Assíncronos** | Coleta automatizada multi-fonte (`.json` + galerias + Imgur, fóruns especializados XenForo/IPS como Adrenaline, Clube do Hardware e Overclock.net, e busca web dirigida). |
| **Filtros Upstream** | Expressões regulares de flair/título (`PT-BR` + `EN`) para rejeitar posts de orçamento, *"vale a pena"*, prints de carrinho, PCPartPicker/MeuPC. |
| **Estado Persistente** | Banco local **SQLite WAL** (`scraped_posts`, `media_assets`, `blacklisted_origins`), 100% retomável e tolerante a falhas. |
| **Download & Sanitização** | Remoção completa de metadados **EXIF**, filtro de resolução mínima (`≥ 300px`) e nitidez (**variância do Laplaciano**), conversão para **WebP** em resolução nativa e **scrub de PII (`RB-15` / `ADR-02`)**. |
| **Deduplicação Perceptual** | Hash criptográfico **SHA-256** + hash perceptual **pHash 64-bit** com distância de Hamming `≤ 4` via UDF no SQLite. |
| **Blacklist Permanente** | **359 descartes** indexados por `URL / SHA-256 / pHash`, bloqueados tanto no enfileiramento quanto no download. |
| **Harvesters Dirigidos** | Scripts especializados (`harvest_500.py`, `harvest_pc_builds.py`) com 25 queries voltadas ao balanceamento de RAM, placas-mãe e builds completas. |

### 1.2 Dataset Atual Limpo (Pós-Blacklist e Balanceamento)
| Classe `L1` | Imagens Limpas | Participação (`%`) |
| :--- | :---: | :---: |
| **GPU (Placa de Vídeo)** | 756 | 35,7% |
| **Placa-mãe (Motherboard)** | 404 | 19,1% |
| **PC Montado (Full Build)** | 363 | 17,1% |
| **Memória RAM** | 306 | 14,4% *(subiu de 3,1% → 14,4% após balanceamento)* |
| **CPU (Processador)** | 290 | 13,7% |
| **Total Consolidado** | **2.119** | **100,0%** |

### 1.3 Auto-Anotação por VLM (`Schema V4`) e Ferramentas de Revisão
- **Schema V4 em chamada única:**
  - *Estágio 1 (Tipo de cena):* `mounted_full_pc` / `bare_hardware` / `retail_box` / `macro_detail` / `screenshot_reject`;
  - *Estágio 2 (Mapeamento de componentes e portas):* coordenadas normalizadas `0–1000` para gabinete, GPU, placa-mãe, cooler (AIO/air/custom), fans, I/O shield, socket (`AM4`/`AM5`/`LGA1700`/`LGA1200`/`LGA2011`), bancos de RAM (incluindo *split* esquerda/direita), bateria CMOS, adesivos/etiquetas, **`PCIe x16`**, **`ATX 24-pin`** e **`slot M.2`**.
- **Metadados de Topologia:** form factor, estado do socket, slots de RAM ocupados, portas SATA, EPS, header USB-C, orientação da GPU, conectores de energia, bordas truncadas, pose em 3 eixos e flags de condição física da CPU.
- **Concorrência e Robustez:** 4 workers assíncronos distribuídos + `max_tokens: 8192` com reparo automático de JSON truncado (*bracket balancer*), crops em resolução nativa e rastreabilidade por `run_N` (manifests JSONL + relatórios Markdown).
- **Dashboard de Revisão Visual:** overlay interativo de bounding boxes (com correção de *letterbox* no eixo Y), filtros por classe/run, cards de crops e exportador YOLO.

### 1.4 Resultados Medidos do Pipeline
| Métrica | Valor Obtido |
| :--- | :--- |
| **Benchmark Run #3 (40 builds completos)** | **40/40 sucesso**, `0` erros de parse, `317 s` (`~7,9 s/img`), **277 crops gerados** |
| **Detecções no Benchmark** | `22 PCIe x16` · `18 ATX 24-pin` · `20 M.2` · `24 bancos RAM` · `16 CMOS` · `15 sockets` · `16 GPUs` · `12 gabinetes` · `11 coolers` · `14 fans` · `27 I/O shields` |
| **Taxa de Descarte (Screenshots/Inválidas)** | `359` de `~2.050` (`~17,5%`) |
| **Run_1 Unificada (Schema V4)** | **1.372 / 2.119 imagens já anotadas e cacheadas** (747 restantes retomáveis sem retrabalho) |

---

## 2. Etapas 2/4, 3/4 e 4/4 — Tasks de Engenharia no Jira (`Sprints 13 → 16`)

| Issue Jira | Sprint | Código e Título | Horas (`Original Estimate`) | Descrição e Critérios de Aceite |
| :--- | :---: | :--- | :---: | :--- |
| **`EDTS-320`** | **Sprint 13**<br/>*(02–08/nov)* | `SPRINT13_003 - [SCANNER] Concluir rotulagem V4 e consolidar dataset` | **8h** | Retomar a `run_1` do `classify_dataset.py` (schema V4, 4 workers) nas 747 imagens restantes aproveitando o cache das 1.371 já geradas. **Aceite:** `2.119/2.119` imagens com `≤ 1%` de falha de parse; novos descartes em `blacklisted_origins`; relatório `RUN_00X_REPORT.md` e run filtrável no dashboard. |
| **`EDTS-347`** | **Sprint 13**<br/>*(02–08/nov)* | `SPRINT13_004 - [SCANNER] Auditoria de qualidade dos rótulos VLM` | **7h** | Revisar amostra estratificada (`≥ 200` imagens nas 5 categorias e 4 tipos de cena) no dashboard, marcando bbox correta/deslocada/ausente/falso positivo. **Aceite:** `≥ 90%` de bboxes aceitáveis nas classes principais; classes `< 80%` reprocessadas. |
| **`EDTS-348`** | **Sprint 13**<br/>*(02–08/nov)* | `SPRINT13_005 - [SCANNER] Exportador YOLO com split anti-vazamento` | **7h** | Evoluir `export_training_dataset.py` para formato Ultralytics YOLO (`images/`, `labels/`, `data.yaml`), split `80/10/10` agrupado por post de origem e cluster de pHash (`Hamming ≤ 4`). **Aceite:** `data.yaml` válido no Ultralytics; `0` vazamento de pHash entre splits; visualização de 20 amostras. |
| **`EDTS-375`** | **Sprint 14**<br/>*(09–15/nov)* | `SPRINT14_001 - [SCANNER] Treino do detector YOLO11s de componentes` | **16h** | Treinar `YOLO11s` (Colab L4, `640px` → fine-tune `1024px`) nas classes de componentes e portas (`GPU`, `placa-mãe`, `cooler`, `fan`, `RAM`, `I/O shield`, `gabinete`, `socket`, `CMOS`, `PCIe x16`, `ATX 24-pin`, `M.2`, `etiqueta`). **Aceite:** `mAP@50 ≥ 0,70`; matriz de confusão; pesos `best.pt` versionados; teste em 20 PCs montados. |
| **`EDTS-377`** | **Sprint 14**<br/>*(09–15/nov)* | `SPRINT14_002 - [SCANNER] Rebalanceamento e expansão do dataset` | **12h** | Coletar imagens adicionais para classes minoritárias (`CPU`, `socket`, `CMOS`, builds SFF), limitar qualquer classe L1 a `≤ 30%` do dataset e incluir `≥ 150` imagens de defeitos físicos (pinos tortos, oxidação, capacitor estufado — `UC-05`/`RB-02`). |
| **`EDTS-408`** | **Sprint 15**<br/>*(16–22/nov)* | `SPRINT15_001 - [SCANNER] Classificador hierárquico L1–L4` | **14h** | Treinar backbone (`ConvNeXt-Small` ou `SigLIP-Base`, `384px`) sobre os crops do detector com cabeças `L1` (categoria), `L2` (marca), `L3` (geração/socket/DDR) e `L4` (linha) + perda de consistência hierárquica + *temperature scaling*. **Aceite:** `Top-1 L1 ≥ 95%`, `L2 ≥ 80%`, `L3 ≥ 75%`; inconsistência `< 2%`. |
| **`EDTS-409`** | **Sprint 15**<br/>*(16–22/nov)* | `SPRINT15_002 - [SCANNER] Embeddings L5 e busca vetorial no catálogo` | **12h** | Cabeça de embedding `ArcFace 512-D` para identificação de SKU (`L5`) + índice vetorial (`FAISS local / pgvector`) com centróides por SKU do `catalog.json` (cadastro de novos SKUs sem retreino). **Aceite:** `Recall@3 ≥ 80%`; consulta `< 50 ms`. |
| **`EDTS-413`** | **Sprint 15**<br/>*(16–22/nov)* | `SPRINT15_003 - [SCANNER] OCR de etiquetas com match no catálogo` | **10h** | Pipeline `PaddleOCR` sobre crops `sticker`/IHS da CPU com normalização e fuzzy match (`RapidFuzz`) contra part numbers do catálogo para desempate de `L4/L5` + scrub de PII (`RB-15` / `ADR-02`). **Aceite:** acurácia `≥ 70%` em 100 etiquetas legíveis. |
| **`EDTS-443`** | **Sprint 16**<br/>*(23–30/nov)* | `SPRINT16_001 - [SCANNER] Exportação ONNX e microserviço /scan` | **14h** | Exportar detector e classificador para ONNX e implementar FastAPI `POST /scan` encadeando `quality gate → detector → classificador → OCR → busca vetorial`. **Aceite:** latência `p95 < 2,0 s` (`RNF-08`), divergência ONNX vs PyTorch `< 1 p.p.`, OpenAPI e `Dockerfile` funcional. |
| **`EDTS-448`** | **Sprint 16**<br/>*(23–30/nov)* | `SPRINT16_002 - [SCANNER] Integração com API Steely e testes E2E` | **12h** | Conectar `/scan` ao backend do Steely (preenchimento automático `RF-03/04`, tag de montagem/volume `RF-05/19`, veto `RB-02` e Setup Builder `RF-02`), suíte E2E com `≥ 30` casos e publicação do *Model Card*. |
