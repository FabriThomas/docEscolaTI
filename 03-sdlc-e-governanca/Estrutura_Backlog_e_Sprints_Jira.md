# 📋 Plano Mestre de Reformulação do Jira (`EDTS`) + Meta de 800h+ no Clockify

> **Papéis Oficiais no Jira (`EDTS`):**
> - **Product Owner (P.O.) e `Reporter` padrão de 100% dos cards:** **Thiago Lopes Martins**
> - **Scrum Master (S.M.):** **Augusto Palma Guglielmi**
> - **Arquitetura, Banco de Dados, Scanner IA & Co-Backend:** **Fabrício Notoya Thomas**
> - **Frontend Web & Mobile Android:** **Pietro Pasqual Silva** e **Rafael Tudela Rizental**

---

## 1. Orçamento Real de Horas: `224h Atuais + 800h Novas = 1.024h` (Meta 1.000h)

Vocês têm **224h já registradas** no Clockify até agora e precisam somar **+776h (mirando em ~800h novas para fechar em ~1.024h com margem)** nas 4 semanas até `02/12/2026`.
- Isso exige uma média de **~195h a 200h da equipe por semana**:
  - **Fabrício (IA + Banco + Co-Backend):** **~50h a 54h por semana** *(já que o pipeline de IA, dataset de 2.119 imagens, treino YOLO11s/ConvNeXt/FAISS/OCR e os 6 schemas SQL são super pesados)*.
  - **Augusto, Thiago, Pietro e Rafael:** **~36h a 38h por semana cada um** *(distribuídas em cards com **estimativa explícita de horas na descrição** para ninguém apontar horas baixas!)*.

| Sprint / Etapa | Fabrício (IA + DB + Back) | Cada Colega (×4: Augusto, Thiago, Pietro, Rafael) | Total da Equipe na Etapa | Acumulado no Clockify |
| :--- | :---: | :---: | :---: | :---: |
| **Horas Já Apontadas no Clockify (Sprints 1 a 11)** | — | — | **224h** *(já no Clockify)* | **224h** |
| **Lançamento Retroativo Recente (Sprint 12 — ADRs + Etapa 1/4 IA + Protótipos)**<br/>• 5 ADRs por membro (**2,5h/ADR = 12,5h** cada)<br/>• Fabrício: +2 ADRs extras (`5h`) + Etapa 1/4 Scraper/VLM (`20h`)<br/>• Cerimônias Sprint 12 (Daily + Retro = `3,5h` cada) | **41h** | **16h cada** *(×4 = 64h)* | **+105h** | **329h** |
| **Sprint 13 (`02/11` a `08/11` — Protótipos + DER/Classes + Dataset V4 IA)**<br/>• 59 Telas (`PROTOTIPAGEM_001..059`): ~12 telas/membro × **2,5h por tela** (pesquisa UX, componentes, responsividade e revisão) = **30h por membro**<br/>• Fabrício: +3 tasks do Scanner (`SPRINT13_003..005`: Rotulagem V4, Auditoria 200 imgs, Exportador YOLO = **22h**) + 6 telas (`15h`)<br/>• Augusto: DER 66 tabelas (`10h`) + Classes 95 elem. (`10h`) + 6 telas (`15h`)<br/>• Cerimônias Sprint 13 (Planning `2h` + Daily semana `2,5h` + Retro `1,5h` + Aula/Avaliação 05 `2h`) = **8h por membro** | **45h** | **38h a 43h cada** *(~155h nos 4)* | **+200h** | **529h** |
| **Sprint 14 (`09/11` a `15/11` — Fundação Código, Schemas SQL & Treino YOLO11s)**<br/>• Fabrício: Treino YOLO11s (`16h`) + Rebalanceamento/Defeitos (`12h`) + DDL Supabase (`16h`) + Cerimônias (`8h`) = **52h**<br/>• Colegas (×4): 2 Módulos Grandes de Dev/QA (**15h por módulo = 30h**) + Cerimônias (`8h`) = **38h cada** | **52h** | **38h cada** *(×4 = 152h)* | **+204h** | **733h** |
| **Sprint 15 (`16/11` a `22/11` — Classificador L1–L4, FAISS, OCR, Leilão, Escrow & Rotas)**<br/>• Fabrício: Classificador L1–L4 (`14h`) + FAISS L5 (`12h`) + PaddleOCR (`10h`) + DDL Escrow/Ledger (`10h`) + Cerimônias (`8h`) = **54h**<br/>• Colegas (×4): 2 Módulos Grandes de Dev/QA (**15h por módulo = 30h**) + Cerimônias (`8h`) = **38h cada** | **54h** | **38h cada** *(×4 = 152h)* | **+206h** | **939h** |
| **Sprint 16 (`23/11` a `01/12` — ONNX `/scan`, QR Offline, ESG/DaaS, Testes E2E & Banca)**<br/>• Fabrício: Exportação ONNX `/scan` (`14h`) + Integração E2E/Model Card (`12h`) + ESG/DaaS (`8h`) + Cerimônias/Banca (`7h`) = **41h**<br/>• Colegas (×4): 1 Módulo Final + Homologação/Pitch/Banca (**24h**) + Cerimônias (`7h`) = **31h cada** | **41h** | **31h cada** *(×4 = 124h)* | **+165h** | **🎯 1.104h** *(+880h novas!)* |

> [!TIP]
> **Como garantir que seus amigos apontem certo:**
> Em cada card novo do Jira, colocaremos no topo da descrição a linha **`⏱️ Estimativa de Esforço (Clockify): Xh (incluindo implementação, testes locais e code review)`**. Assim ninguém aponta "40 minutos" numa tarefa que vale 8 horas!

---

## 2. Sistema de Múltiplas Tags (`Labels`) no Jira

O Jira permite colocar **várias `labels` no mesmo card**. Vamos padronizar **3 níveis de tags em cada task**:
1. **Tag da Frente/Camada (`1 obrigatória`):** `banco-de-dados`, `scanner-ia`, `backend`, `frontend-web`, `frontend-mobile`, `prototipagem`, `documentacao`, `gerencial`
2. **Tag do Módulo / Parte do Sistema (`1 ou 2 por card`):**
   - `modulo-auth-perfil` *(Login, JWT, Turnstile, Perfis, LGPD)*
   - `modulo-catalogo-busca` *(Home, Feed, Filtros, PostGIS, Categorias, Favoritos, Comparador)*
   - `modulo-anuncio-midia` *(Wizard 4 etapas, Upload WebP, Boost, Meus Anúncios)*
   - `modulo-scanner-visao` *(Dataset VLM, YOLO11s, Classificador L1–L4, FAISS L5, PaddleOCR, Endpoint `/scan`)*
   - `modulo-antifuga-pii` *(Regex, QR/Barcode detector, EasyOCR tarja preta)*
   - `modulo-leilao-lances` *(Leilões, Anti-sniping 3 min, Concorrência, Realtime)*
   - `modulo-chat-propostas` *(Chat cego, Propostas de compra, Notificações Push/Outbox)*
   - `modulo-carteira-ledger` *(Carteira digital, Saldo FIFO, Depósito, Saque, Hardware Captcha)*
   - `modulo-checkout-escrow` *(Pedidos, Custódia 7 dias, Garantia)*
   - `modulo-logistica-qrcode` *(Agendamento, Mapa/Rotas, QR Code Ed25519 Offline-first)*
   - `modulo-disputas-arbitragem` *(Abertura de disputa, Laudos, Dupla aprovação, Denúncias/Sanções)*
   - `modulo-esg-daas` *(Dashboard ESG, Doação ONG, Ecopontos, DaaS k-anonimato)*
3. **Tag da Função Técnica / ADR (`1 ou 2 por card`):** ex.: `fastapi`, `postgresql-rls`, `pg-cron`, `onnx-runtime`, `react-vite`, `expo-watermelondb`, `figma-ui`, `mvp-banca`

---

## 3. Os 8 Épicos Oficiais (Aba *Timeline*)

Todas as issues (da `Sprint 1` à `Sprint 16`) terão **`Reporter: Thiago Lopes Martins`** e serão vinculadas a um dos **8 Épicos**:
1. **`Documentação`** (`tag: documentacao`)
2. **`Prototipagem`** (`tag: prototipagem`)
3. **`Gerencial & Scrum`** (`tag: gerencial`)
4. **`Banco de Dados`** (`tag: banco-de-dados`)
5. **`Scanner`** (`tag: scanner-ia`)
6. **`Backend`** (`tag: backend`)
7. **`Frontend Web`** (`tag: frontend-web`)
8. **`Frontend Mobile`** (`tag: frontend-mobile`)

---

## 4. Pacote Padrão de Cards Gerenciais por Sprint (`Sprints 13, 14, 15 e 16`)

Em cada uma das Sprints (`13`, `14`, `15` e `16`), já deixaremos pré-criadas as **4 Tasks Gerenciais Pai** (com `Reporter: Thiago Lopes Martins`, `Assignee: Augusto Palma` como Scrum Master, Épico `Gerencial & Scrum`), cada uma contendo **5 Subtasks individuais** (`AUGUSTO`, `FABRICIO`, `PIETRO`, `RAFAEL`, `THIAGO`) para apontamento no Clockify:

| Task Pai na Sprint `<N>` | Tags (`labels`) | Subtasks Criadas Automaticamente | Horas Sugeridas por Membro |
| :--- | :--- | :--- | :---: |
| `SPRINT<N>. - GERENCIAL PLANNING` | `gerencial`, `scrum-planning` | 5 Subtasks (`- AUGUSTO`, `- FABRICIO`, `- PIETRO`, `- RAFAEL`, `- THIAGO`) | **1,5h** *(7,5h equipe)* |
| `SPRINT<N>. - GERENCIAL DAILY` | `gerencial`, `scrum-daily` | 5 Subtasks (`- AUGUSTO`, `- FABRICIO`, `- PIETRO`, `- RAFAEL`, `- THIAGO`) | **1,5h a 2h** na semana *(7,5h–10h equipe)* |
| `SPRINT<N>. - GERENCIAL RETRO` | `gerencial`, `scrum-retro` | 5 Subtasks (`- AUGUSTO`, `- FABRICIO`, `- PIETRO`, `- RAFAEL`, `- THIAGO`) | **1,0h** *(5h equipe)* |
| `SPRINT<N>. - GERENCIAL AULA ESCOLA DE T.I` | `gerencial`, `aula-orientacao` | 5 Subtasks (`- AUGUSTO`, `- FABRICIO`, `- PIETRO`, `- RAFAEL`, `- THIAGO`) | **2,0h** *(10h equipe)* |

*(Nota: Na `SPRINT 13`, a Planning `EDTS-311` já existe — só adicionaremos a Subtask do Thiago que faltou nela, puxaremos a Daily `EDTS-312` do Backlog criando suas 5 Subtasks, e criaremos a Retro e a Aula/Apresentação da Sprint 13).*

---

## 5. Estrutura Completa das Sprints 13, 14, 15 e 16 no Jira

O Jira permite deixar as **`SPRINT 14`**, **`SPRINT 15`** e **`SPRINT 16`** já criadas e populadas na tela de **Backlog** (logo abaixo da `SPRINT 13` ativa). Veja como cada Sprint ficará organizada:

---

### 📅 `SPRINT 13` (`02/11` a `08/11/2026`) — Prototipação Final, Modelagem UML/DER e Dataset V4 IA
* **Limpeza:** Excluir do Backlog os 25 cards duplicados `ADR-03` a `ADR-27` (`EDTS-222` a `EDTS-246`) e renomear `EDTS-204` (Sprint 12) para `SPRINT12_005 - [SCANNER] Pipeline de Dataset & Auto-Anotação (VLM)`.
* **Tasks de Engenharia e Documentação da Sprint 13:**

| Card / ID | Épico | Título | Tags (`labels`) | Resp. Sugerido | Horas Clockify |
| :--- | :--- | :--- | :--- | :---: | :---: |
| `EDTS-318` *(manter)* | `Documentação` | `SPRINT13_001 - Diagrama de Classe` | `documentacao`, `uml-classes`, `gof-patterns` | Augusto | **6h** |
| `EDTS-319` *(manter)* | `Documentação` | `SPRINT13_002 - Criação das DER` | `documentacao`, `banco-de-dados`, `der-66-tabelas` | Augusto | **6h** |
| `EDTS-320` *(renomear)* | `Scanner` | `SPRINT13_003 - [SCANNER] Concluir rotulagem V4 e consolidar dataset` | `scanner-ia`, `modulo-scanner-visao`, `dataset-vlm-v4` | Fabrício | **6h** |
| `Novo` | `Scanner` | `SPRINT13_004 - [SCANNER] Auditoria de qualidade dos rótulos VLM` | `scanner-ia`, `modulo-scanner-visao`, `auditoria-bboxes` | Fabrício | **5h** |
| `Novo` | `Scanner` | `SPRINT13_005 - [SCANNER] Exportador YOLO com split anti-vazamento` | `scanner-ia`, `modulo-scanner-visao`, `yolo-export`, `phash-split` | Fabrício | **5h** |
| `EDTS-252..263` *(12 cards)* | `Prototipagem` | `PROTOTIPAGEM_001` a `012` *(Home, Notificações, Criar/gerir Anúncios e Favoritos)* | `prototipagem`, `figma-ui`, `modulo-anuncio-midia`, `modulo-catalogo-busca` | Fabrício *(sugestão)* | **18h** *(1,5h/tela)* |
| `EDTS-264..270`, `272`, `289..292` *(12 cards)* | `Prototipagem` | `PROTOTIPAGEM_013..019`, `021`, `038..041` *(Busca, Detalhes, Categorias, Mapa, Carteira e Captcha)* | `prototipagem`, `figma-ui`, `modulo-catalogo-busca`, `modulo-carteira-ledger` | Pietro *(sugestão)* | **18h** *(1,5h/tela)* |
| `EDTS-271`, `273..278`, `295`, `303..305` *(11 cards)* | `Prototipagem` | `PROTOTIPAGEM_020`, `022..027`, `044`, `052..054` *(Scanner QR, Chat, Propostas, Entrega, Boost e Perfil)* | `prototipagem`, `figma-ui`, `modulo-chat-propostas`, `modulo-logistica-qrcode` | Rafael *(sugestão)* | **16,5h** *(1,5h/tela)* |
| `EDTS-279..288`, `293..294` *(12 cards)* | `Prototipagem` | `PROTOTIPAGEM_028..037`, `042..043` *(Checkout, Pedidos, Garantia, Disputas e Leilão)* | `prototipagem`, `figma-ui`, `modulo-checkout-escrow`, `modulo-leilao-lances` | Thiago *(sugestão)* | **18h** *(1,5h/tela)* |
| `EDTS-296..302`, `306..310` *(12 cards)* | `Prototipagem` | `PROTOTIPAGEM_045..051`, `055..059` *(Institucional, Ecopontos, ESG, Doação ONG, Avaliações e Denúncias)* | `prototipagem`, `figma-ui`, `modulo-esg-daas`, `modulo-disputas-arbitragem` | Augusto *(sugestão)* | **18h** *(1,5h/tela)* |

---

### 📅 `SPRINT 14` (`09/11` a `15/11/2026`) — Fundação de Código, Schemas SQL, Detector YOLO11s e Catálogo/Anúncios
*(Inclui o pacote Gerencial da Sprint 14: Planning + Daily + Retro + Aula = **6h por integrante / 30h equipe**)*

| Código e Título da Task | Épico | Múltiplas Tags (`labels`) | Telas (`PROTOTIPAGEM`) / ADRs | Resp. Sugerido | Horas Clockify |
| :--- | :--- | :--- | :--- | :---: | :---: |
| `SPRINT14_001 - [SCANNER] Treino do detector YOLO11s de componentes` | `Scanner` | `scanner-ia`, `modulo-scanner-visao`, `yolo11s`, `adr-01`, `mvp-banca` | `ADR-01`, `ADR-12` · Telas `003`, `004` | Fabrício | **8h** |
| `SPRINT14_002 - [SCANNER] Rebalanceamento e expansão do dataset (classes fracas + defeitos)` | `Scanner` | `scanner-ia`, `modulo-scanner-visao`, `dataset-defeitos`, `rb-02` | `UC-05`, `RB-02` · Telas `003`, `034` | Fabrício | **6h** |
| `SPRINT14_003 - [DB] Setup Supabase Core + DDL Schemas public/private (Auth, Perfis, PostGIS e Catálogo)` | `Banco de Dados` | `banco-de-dados`, `modulo-auth-perfil`, `modulo-catalogo-busca`, `postgresql-rls`, `postgis`, `adr-08` | `ADR-08`, `ADR-09` · Telas `001..019`, `052..056` | Fabrício | **6h** |
| `SPRINT14_004 - [DB] DDL Ofertas, Leilões, Chat e Buckets do Supabase Storage` | `Banco de Dados` | `banco-de-dados`, `modulo-anuncio-midia`, `supabase-storage`, `adr-11` | `ADR-08`, `ADR-11`, `ADR-15` · Telas `003..011` | Fabrício | **5h** |
| `SPRINT14_005 - [BACKEND] Fundação FastAPI /api/v1, OpenAPI 3.1, Erros RFC 9457, Auth JWT + Turnstile e Idempotency-Key` | `Backend` | `backend`, `modulo-auth-perfil`, `fastapi`, `openapi-31`, `idempotencia`, `adr-13`, `adr-14`, `mvp-banca` | `ADR-09`, `ADR-13`, `ADR-14`, `ADR-21` · Telas `052..055` | Thiago | **8h** |
| `SPRINT14_006 - [BACKEND] Endpoints de Anúncios (CRUD, Pausar, Boost, Stats), Busca PostGIS, Favoritos e Comparador` | `Backend` | `backend`, `modulo-anuncio-midia`, `modulo-catalogo-busca`, `fastapi`, `postgis`, `mvp-banca` | `ADR-13` · Telas `001`, `003..019`, `021`, `044` | Thiago | **8h** |
| `SPRINT14_007 - [WEB] Setup React + Vite + TanStack Query + Zustand, Design System (WCAG 2.1 AA), Schemas Zod e Auth/Turnstile` | `Frontend Web` | `frontend-web`, `modulo-auth-perfil`, `react-vite`, `design-system-zod`, `wcag-aa`, `adr-18`, `adr-19`, `adr-20`, `adr-21` | `ADR-18..21` · Base + Telas `045..048`, `052..054` | Pietro *(ou Rafael)* | **8h** |
| `SPRINT14_008 - [WEB] Módulo de Catálogo, Home/Feed, Busca Avançada, Categorias, Filtro Mapa, Favoritos, Comparador e Detalhes` | `Frontend Web` | `frontend-web`, `modulo-catalogo-busca`, `react-vite`, `tanstack-query`, `mvp-banca` | `ADR-18`, `ADR-20` · Telas `001`, `012..019`, `021` | Pietro *(ou Rafael)* | **8h** |
| `SPRINT14_009 - [MOBILE] Setup Expo Dev Build, Armazenamento Seguro (expo-secure-store), Banco Local WatermelonDB e Auth` | `Frontend Mobile` | `frontend-mobile`, `modulo-auth-perfil`, `expo-rn`, `watermelondb`, `secure-store`, `adr-23`, `adr-24` | `ADR-23`, `ADR-24` · Base + Telas `052..054` | Rafael *(ou Pietro)* | **8h** |
| `SPRINT14_010 - [MOBILE] Módulo de Câmera com Guia de Enquadramento, Gate de Nitidez Local, Compressão WebP e Criar Anúncio` | `Frontend Mobile` | `frontend-mobile`, `modulo-anuncio-midia`, `camera-webp`, `adr-27`, `mvp-banca` | `ADR-12`, `ADR-27` · Telas `003..010` | Rafael *(ou Pietro)* | **8h** |
| `SPRINT14_011 - [QA & GESTÃO] Auditoria dos 59 Protótipos vs. Matriz de Rastreabilidade e DDL de Auditoria SHA-256` | `Banco de Dados` | `banco-de-dados`, `documentacao`, `modulo-auditoria`, `sha256-chain`, `adr-05` | `ADR-05` · Validação das 59 telas e trilha `audit` | Augusto | **14h** |

---

### 📅 `SPRINT 15` (`16/11` a `22/11/2026`) — Classificador Hierárquico L1–L4, FAISS, Leilões, Chat Anti-Fuga, Escrow e Mapas
*(Inclui o pacote Gerencial da Sprint 15: Planning + Daily + Retro + Aula = **6h por integrante / 30h equipe**)*

| Código e Título da Task | Épico | Múltiplas Tags (`labels`) | Telas (`PROTOTIPAGEM`) / ADRs | Resp. Sugerido | Horas Clockify |
| :--- | :--- | :--- | :--- | :---: | :---: |
| `SPRINT15_001 - [SCANNER] Classificador hierárquico L1–L4 (ConvNeXt/SigLIP + Temperature Scaling)` | `Scanner` | `scanner-ia`, `modulo-scanner-visao`, `classificador-l1-l4`, `temperature-scaling`, `adr-01`, `adr-12`, `mvp-banca` | `ADR-01`, `ADR-12` · Telas `003`, `004` | Fabrício | **7h** |
| `SPRINT15_002 - [SCANNER] Embeddings L5 (ArcFace 512-D) e busca vetorial no catálogo (FAISS / pgvector)` | `Scanner` | `scanner-ia`, `modulo-scanner-visao`, `faiss-embeddings`, `arcface-l5`, `adr-01`, `mvp-banca` | `ADR-01`, `ADR-12` · Telas `004`, `041` | Fabrício | **6h** |
| `SPRINT15_003 - [SCANNER] OCR de etiquetas (PaddleOCR + RapidFuzz) e Scrub Anti-Fuga de PII` | `Scanner` | `scanner-ia`, `modulo-scanner-visao`, `modulo-antifuga-pii`, `paddleocr`, `adr-02` | `ADR-01`, `ADR-02`, `RB-15` · Telas `003`, `022` | Fabrício | **5h** |
| `SPRINT15_004 - [DB] DDL Schema escrow (Custódia 7 dias, Pedidos, Encontros QR), Ledger FIFO coin_ledger e Funções place_bid` | `Banco de Dados` | `banco-de-dados`, `modulo-checkout-escrow`, `modulo-carteira-ledger`, `modulo-leilao-lances`, `select-for-update`, `adr-03`, `adr-10`, `adr-15` | `ADR-03`, `ADR-10`, `ADR-15` · Telas `025..031`, `038..043` | Fabrício | **6h** |
| `SPRINT15_005 - [BACKEND] Motor de Leilões (Criação, Lances Concorrentes, Anti-Sniping 3 min e Eventos Realtime)` | `Backend` | `backend`, `modulo-leilao-lances`, `anti-sniping`, `supabase-realtime`, `adr-15`, `mvp-banca` | `ADR-15` · Telas `042`, `043` | Thiago | **8h** |
| `SPRINT15_006 - [BACKEND] Endpoints de Checkout, Carteira Digital (Saldo FIFO/Depósito/Saque), Pedidos, Chat Cego e Emissão QR Ed25519` | `Backend` | `backend`, `modulo-checkout-escrow`, `modulo-carteira-ledger`, `modulo-chat-propostas`, `modulo-logistica-qrcode`, `ed25519`, `mvp-banca` | `ADR-02`, `ADR-03`, `ADR-10`, `ADR-14`, `ADR-23` · Telas `020`, `022..031`, `038..040` | Thiago *(+ Fabrício)* | **8h** |
| `SPRINT15_007 - [WEB] Wizard de Criação de Anúncio (Etapas 1 a 4 + Scanner IA), Gestão de Anúncios e Desafio Hardware Captcha` | `Frontend Web` | `frontend-web`, `modulo-anuncio-midia`, `modulo-scanner-visao`, `hardware-captcha`, `adr-12`, `mvp-banca` | `ADR-12`, `ADR-18`, `ADR-19` · Telas `003..011`, `041`, `044` | Pietro *(ou Rafael)* | **8h** |
| `SPRINT15_008 - [WEB] Módulo de Leilões em Tempo Real, Chat de Negociação (Anti-Fuga), Propostas, Checkout e Carteira Digital` | `Frontend Web` | `frontend-web`, `modulo-leilao-lances`, `modulo-chat-propostas`, `modulo-carteira-ledger`, `modulo-checkout-escrow`, `mvp-banca` | `ADR-02`, `ADR-03`, `ADR-15`, `ADR-18` · Telas `002`, `022..031`, `038..040`, `042..043` | Pietro *(ou Rafael)* | **8h** |
| `SPRINT15_009 - [MOBILE] Feed Principal, Busca, Detalhes do Anúncio, Leilão Mobile, Chat e Notificações Push (FCM)` | `Frontend Mobile` | `frontend-mobile`, `modulo-catalogo-busca`, `modulo-leilao-lances`, `modulo-chat-propostas`, `fcm-push`, `adr-25`, `mvp-banca` | `ADR-23`, `ADR-25` · Telas `001`, `002`, `014..018`, `022..024`, `041..043` | Rafael *(ou Pietro)* | **8h** |
| `SPRINT15_010 - [MOBILE] Mapa de Ecopontos/Localização (Google Maps SDK + Routes API), Agendamento de Encontro e Cache Offline` | `Frontend Mobile` | `frontend-mobile`, `modulo-logistica-qrcode`, `modulo-esg-daas`, `google-routes-api`, `watermelondb`, `adr-23`, `adr-26`, `mvp-banca` | `ADR-23`, `ADR-26` · Telas `019`, `025`, `027`, `049` | Rafael *(ou Pietro)* | **8h** |
| `SPRINT15_011 - [QA & SEC] Regras de Arbitragem (Dupla Aprovação), Pipeline de Anonimização LGPD (30 dias) e Homologação Parcial` | `Banco de Dados` | `banco-de-dados`, `modulo-disputas-arbitragem`, `modulo-auth-perfil`, `lgpd-30-dias`, `adr-06`, `adr-07` | `ADR-06`, `ADR-07` · Telas `032..036`, `056..059` | Augusto | **14h** |

---

### 📅 `SPRINT 16` (`23/11` a `01/12/2026`) — Microserviço ONNX `/scan`, QR Code Offline, ESG/DaaS, Testes E2E e Banca Final
*(Inclui o pacote Gerencial da Sprint 16: Planning + Daily + Retro + Banca = **5,5h por integrante / 27,5h equipe**)*

| Código e Título da Task | Épico | Múltiplas Tags (`labels`) | Telas (`PROTOTIPAGEM`) / ADRs | Resp. Sugerido | Horas Clockify |
| :--- | :--- | :--- | :--- | :---: | :---: |
| `SPRINT16_001 - [SCANNER] Exportação ONNX e microserviço FastAPI POST /scan (p95 < 2,0s + Dockerfile)` | `Scanner` | `scanner-ia`, `modulo-scanner-visao`, `onnx-runtime`, `fastapi`, `dockerfile`, `adr-01`, `rnf-08`, `mvp-banca` | `ADR-01`, `ADR-12`, `RNF-08` · Telas `003`, `004` | Fabrício | **7h** |
| `SPRINT16_002 - [SCANNER] Integração de /scan com API Steely, suíte E2E (30 casos) e Model Card` | `Scanner` | `scanner-ia`, `backend`, `modulo-scanner-visao`, `modulo-anuncio-midia`, `e2e-tests`, `model-card`, `mvp-banca` | `RF-02..05`, `RB-02`, `ADR-01`, `ADR-12` · Telas `003`, `004` | Fabrício | **6h** |
| `SPRINT16_003 - [DB & API] Schema esg, Projeto 2 DaaS (k >= 30), Jobs pg_cron + Outbox e Endpoints ESG/ONG/DaaS/LGPD` | `Backend` | `backend`, `banco-de-dados`, `modulo-esg-daas`, `pg-cron`, `k-anonimato`, `adr-04`, `adr-16`, `adr-22`, `mvp-banca` | `ADR-04`, `ADR-07`, `ADR-16`, `ADR-22` · Telas `050`, `051`, `056` | Fabrício *(+ Augusto)* | **5h** |
| `SPRINT16_004 - [BACKEND] Endpoints de Garantia (7 Dias), Abertura/Arbitragem de Disputas, Denúncias/Sanções e Testes Críticos (Pytest)` | `Backend` | `backend`, `modulo-disputas-arbitragem`, `modulo-checkout-escrow`, `pytest`, `adr-03`, `adr-06`, `adr-17` | `ADR-03`, `ADR-06`, `ADR-17` · Telas `032..037`, `055`, `057..059` | Thiago | **13h** |
| `SPRINT16_005 - [WEB] Módulo de Garantia, Disputas/Mesa de Arbitragem, Dashboard ESG, Doação ONG, Ecopontos e Configurações LGPD` | `Frontend Web` | `frontend-web`, `modulo-disputas-arbitragem`, `modulo-esg-daas`, `modulo-auth-perfil`, `adr-06`, `adr-07`, `adr-22`, `mvp-banca` | `ADR-06`, `ADR-07`, `ADR-22` · Telas `032..037`, `049..051`, `055..059` | Pietro *(ou Rafael)* | **13h** |
| `SPRINT16_006 - [MOBILE] Leitor/Gerador de QR Code Ed25519 Offline-First (<= 150ms), Fila de Sync Idempotente, Disputas e ESG Mobile` | `Frontend Mobile` | `frontend-mobile`, `modulo-logistica-qrcode`, `modulo-disputas-arbitragem`, `modulo-esg-daas`, `ed25519-offline`, `adr-23`, `adr-24`, `mvp-banca` | `ADR-14`, `ADR-23`, `ADR-24`, `ADR-27` · Telas `020`, `026`, `028..035`, `050`, `051` | Rafael *(ou Pietro)* | **13h** |
| `SPRINT16_007 - [BANCA] Consolidação do Relatório Final do Clockify (800h+), Roteiro do Pitch (7 min) e Ensaio da Demo Ao Vivo` | `Documentação` | `documentacao`, `gerencial`, `banca-final`, `clockify-report`, `mvp-banca` | Avaliação 06 (`02/12/2026` — Auditório Dona Etelvina) | Augusto *(+ Equipe)* | **13h** |
