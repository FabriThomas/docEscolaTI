# Documento de Requisitos — Projeto Steely

> **Arquivo Original:** [`originais/Documento_de_Requisitos.pdf`](originais/Documento_de_Requisitos.pdf)  
> **Projeto:** Steely — Escola de TI · UniCesumar

---

## 1. Requisitos Funcionais (RF)

| Código | Nome | Descrição | User Stories Relacionadas | ADRs Relacionados |
| --- | --- | --- | --- | --- |
| **RF-01** | Cadastro e Autenticação de Utilizadores | O sistema deve permitir o cadastro e autenticação de utilizadores via e-mail/senha, login social, 2FA, recuperação de conta e exclusão com carência de 30 dias. | `STY001`–`STY012` | `ADR-07`, `ADR-09`, `ADR-13`, `ADR-21`, `ADR-24` |
| **RF-02** | Ferramenta de Montagem de Setup e Tendências | O sistema deve fornecer um construtor de setups, verificando compatibilidade automática entre peças, calculando consumo/desempenho/gargalo e exibindo tendências de preços. | `STY013`–`STY015` | `ADR-08`, `ADR-18` |
| **RF-03** | Publicação de Ofertas | O sistema deve permitir a criação de anúncios com fotos (até 6 imagens WebP sem EXIF), descrição e localização aproximada, oferecendo o uso opcional do Scanner IA em troca de moedas virtuais. | `STY016`, `STY017`, `STY019` | `ADR-01`, `ADR-02`, `ADR-11`, `ADR-12`, `ADR-27` |
| **RF-04** | Triagem Técnica de Hardware | O sistema deve permitir o detalhamento técnico de componentes via seletores manuais ou preenchimento automatizado/assistido pelo Scanner IA, além de exibir histórico de defeitos crônicos. | `STY016`, `STY017`, `STY055` | `ADR-01`, `ADR-12`, `ADR-27` |
| **RF-05** | Classificação Logística eItens Compostos | O sistema deve permitir categorizar a oferta como Peça Avulsa, Máquina Montada ou Lote (padrão *Composite*). | `STY013`, `STY016` | `ADR-01`, `ADR-08` |
| **RF-06** | Filtro Geográfico e Busca Avançada | O sistema deve permitir que o comprador busque e filtre ofertas por termo, categoria, condição, preço e raio de distância, mantendo o endereço exato oculto até a reserva. | `STY020` | `ADR-08`, `ADR-09`, `ADR-18` |
| **RF-07** | Chat Interno com Proteção Anti-Fuga | O sistema deve permitir a troca de mensagens em tempo real entre utilizadores, bloqueando números de telefone, e-mails, links externos, arrobas e chaves Pix antes da reserva confirmada. | `STY021`–`STY024`, `STY052` | `ADR-02`, `ADR-09`, `ADR-18`, `ADR-19` |
| **RF-08** | Sistema de Propostas para Lotes | O sistema deve permitir o envio de propostas e contrapropostas (validade de 24 h) em ofertas de lotes, reservando os itens durante a negociação. | `STY038` | `ADR-08`, `ADR-16` |
| **RF-09** | Agendamento de Encontro e Retirada (*Time Slots*) | O sistema deve permitir o agendamento de janelas de horário e pontos de encontro seguros entre comprador e vendedor (com SLA de 48 h para resposta à reserva). | `STY025`, `STY026` | `ADR-16`, `ADR-23`, `ADR-25` |
| **RF-10** | Gestão e Consulta Offline de Rotas | O sistema deve permitir gerar a rota até o ponto de encontro confirmado (via Google Routes API no backend) e consultá-la mesmo sem conexão de rede. | `STY029` | `ADR-23`, `ADR-26` |
| **RF-11** | Confirmação de Entrega via QR Code e Custódia | O sistema deve validar presencialmente a entrega via leitura de QR Code único assinado digitalmente (`Ed25519`), retendo o valor em custódia simulada (*escrow*) por 7 dias. | `STY027`, `STY028` | `ADR-03`, `ADR-14`, `ADR-23`, `ADR-24` |
| **RF-12** | Comprovante de Transação em PDF | O sistema deve gerar comprovante auditável da transação e entrega em formato PDF com hash de integridade. | `STY032` | `ADR-03`, `ADR-11` |
| **RF-13** | Pós-Compra: Laudo Técnico, Devolução e Arbitragem | O sistema deve permitir emissão de laudo técnico pós-compra (gatilho de cashback em moedas), solicitação de devolução em até 7 dias e arbitragem em dois níveis com dupla aprovação. | `STY030`, `STY031`, `STY033`–`STY035` | `ADR-03`, `ADR-06`, `ADR-09`, `ADR-10`, `ADR-16` |
| **RF-14** | Carteira e Ledger de Moedas Virtuais | O sistema deve gerir o saldo de moedas virtuais em ledger imutável *append-only* de partidas dobradas com expiração FIFO em 365 dias. | `STY042`–`STY045` | `ADR-10`, `ADR-14`, `ADR-16` |
| **RF-15** | Leilões com Anti-Sniping | O sistema deve disponibilizar leilões com taxa de participação de 5 moedas (`BID_HOLD`), lances em centavos e prorrogação automática (*anti-sniping*: +120 s nos últimos 60 s). | `STY036`, `STY037` | `ADR-10`, `ADR-14`, `ADR-15`, `ADR-16`, `ADR-18`, `ADR-25` |
| **RF-16** | Impulsionamento de Ofertas (*Boost*) | O sistema deve permitir destacar ofertas mediante queima de moedas virtuais ou cota gratuita para ONGs verificadas. | `STY018` | `ADR-10`, `ADR-14` |
| **RF-17** | Mural Institucional e Economia Circular (Ecopontos) | O sistema deve permitir cadastro verificado de ONGs/Escolas, publicação de pedidos de doação com boost gratuito e sugestão de Ecopontos de reciclagem + guias educativos. | `STY039`–`STY041`, `STY057`, `STY058` | `ADR-08`, `ADR-16`, `ADR-26` |
| **RF-18** | Métricas de Impacto ESG | O sistema deve calcular e exibir o impacto ambiental (kg de lixo eletrônico evitado, $\text{CO}_2$ poupado e peças reaproveitadas) por usuário e consolidado da plataforma (`k ≥ 30`). | `STY054` | `ADR-04`, `ADR-16`, `ADR-22` |
| **RF-19** | Filtros Binários e Granulares de Condição | O sistema deve exigir na publicação e busca a distinção entre `"PC Montado"` e `"Peça Avulsa"` e os 5 estados granulares de condição funcional. | `STY016`, `STY020` | `ADR-01`, `ADR-19` |
| **RF-20** | Hardware Captcha e MLOps do Scanner IA | O sistema deve apresentar desafios comunitários de rotulagem de fotos de hardware (recompensados com moedas) e governar o retreino e promoção gradual de modelos de IA. | `STY046`–`STY048` | `ADR-01`, `ADR-10`, `ADR-12`, `ADR-21` |
| **RF-21** | Moderação, Auditoria Imutável e Relatórios DaaS | O sistema deve permitir moderação de denúncias, consulta à trilha de auditoria imutável encadeada por hash e extração de relatórios DaaS anonimizados (`k ≥ 30` e `≥ 3` vendedores). | `STY049`–`STY053`, `STY056` | `ADR-02`, `ADR-04`, `ADR-05`, `ADR-06`, `ADR-16` |

---

## 2. Requisitos Não Funcionais (RNF — Matriz Consolidada v1 e v2)

| Código | Categoria | Requisito / Meta Mensurável | ADRs que Atendem |
| --- | --- | --- | --- |
| **RNF-01** | Segurança e Autenticação | Autenticação obrigatória JWT + 2FA opcional + guarda segura de chaves/tokens no Android Keystore (`expo-secure-store`) e RBAC/ABAC/RLS com Data API pública desligada. | `ADR-09`, `ADR-13`, `ADR-24` |
| **RNF-02** | Validação Criptográfica Offline | Validação offline da assinatura digital `Ed25519` do QR Code de entrega concluída em **≤ 150 ms** no dispositivo. | `ADR-13`, `ADR-17`, `ADR-24` |
| **RNF-03** | Privacidade e LGPD | Carência de 30 dias na exclusão de conta (com aviso 7 dias antes), anonimização irreversível, retenção fiscal segregada por 5 anos (`private.retencao_legal`), expurgo de EXIF/GPS e *k-anonimato* (`k ≥ 30` e `≥ 3` vendedores) no DaaS. | `ADR-02`, `ADR-04`, `ADR-07`, `ADR-08`, `ADR-11`, `ADR-22` |
| **RNF-04** | Desempenho de API | Latência de leitura **p95 ≤ 200 ms** e escrita **p99 ≤ 500 ms** sob arquitetura Stateless REST (`/api/v1`, OpenAPI 3.1). | `ADR-08`, `ADR-13`, `ADR-15`, `ADR-17`, `ADR-18` |
| **RNF-05** | Compatibilidade de Mídia e Inferência IA | Compressão de imagem no cliente para **≤ 2 MB** antes do upload, conversão server-side para WebP sem EXIF e inferência do Scanner IA em **≤ 4,0 s** com *Circuit Breaker* em **3,5 s** (Estágio 0 em **< 150 ms**). | `ADR-01`, `ADR-11`, `ADR-12`, `ADR-27` |
| **RNF-06** | Tempo Real e Notificações | Propagação de mensagens de chat e lances de leilão em **≤ 100 ms** via WebSocket (Supabase Realtime) e notificações push em segundo plano via FCM / Expo Push Service. | `ADR-09`, `ADR-15`, `ADR-18`, `ADR-25` |
| **RNF-07** | Disponibilidade Offline e Sincronização | Armazenamento local de rotas e encontros (`WatermelonDB` no Android e `IndexedDB` no Web) com sincronização automática em segundo plano em **≤ 10 s** após reconexão. | `ADR-18`, `ADR-23`, `ADR-26` |
| **RNF-08 / RNF-09** | Idempotência, Concorrência e MLOps | Chaves de idempotência (`Idempotency-Key` retida por 72 h + constraints `UNIQUE` naturais) e travas transacionais (`SELECT ... FOR UPDATE`) para impedir duplicidade em escrow, moedas e lances; estrutura de curadoria e versionamento de modelos de IA. | `ADR-01`, `ADR-03`, `ADR-10`, `ADR-14`, `ADR-15`, `ADR-16` |
| **RNF-10** | Acessibilidade e Qualidade Web | Conformidade com **WCAG 2.1 nível AA**, responsividade *mobile-first* e pontuação **Lighthouse ≥ 90** verificada no CI. | `ADR-17`, `ADR-19`, `ADR-20` |
| **RNF-11** | Auditoria Imutável e Observabilidade | Logs *append-only* particionados mensalmente com cadeia criptográfica de hashes (`SHA-256`), `Correlation ID` ponta a ponta, retenção de 12 meses (sistema/acesso) e 60 meses (financeiro/disputas) e verificação diária (`private.audit_verify`). | `ADR-05`, `ADR-13`, `ADR-16` |
| **RNF-13** | Proteção de Borda e Rate Limiting | Proteção contra força bruta e abuso automatizado com Cloudflare WAF na borda, `slowapi` por IP real (`CF-Connecting-IP`) e desafio Cloudflare Turnstile a partir da 3ª falha de login. | `ADR-09`, `ADR-13`, `ADR-17`, `ADR-21` |
