# 🎨 Catálogo de Prototipação de Alta Fidelidade (Figma — 59 Telas)

> **Épico no Jira:** [`EDTS-322 — Prototipagem`](../03-sdlc-e-governanca/Estrutura_Backlog_e_Sprints_Jira.md)  
> **Padrões de UI e Acessibilidade:** [`ADR-19 (Design System e Schemas Zod)`](../02-adrs/md/ADR-19_Validacao_e_Schemas_Compartilhados.md) · [`ADR-20 (Acessibilidade WCAG 2.1 AA e Responsividade)`](../02-adrs/md/ADR-20_Estrategia_de_Renderizacao_Web.md)

O protótipo de alta fidelidade do **Steely** contempla **59 telas funcionais (`PROTOTIPAGEM_001` a `PROTOTIPAGEM_059`)**, cobrindo toda a jornada do usuário na Web (SPA React + Vite) e no Mobile Android (React Native + Expo), com rastreabilidade direta para a [Especificação de Casos de Uso (`STY001` a `STY058`)](Especificacao_de_Casos_de_Uso.md), as [Regras de Negócio (`RB-01` a `RB-15`)](Regras_de_Negocio.md) e os [27 ADRs](../02-adrs/README.md).

---

## 🗺️ Mapeamento Completo das 59 Telas (`EDTS-252` a `EDTS-310`)

| Código da Tela | Issue Jira | Nome da Tela / Fluxo no Protótipo | Módulo do Sistema (`tag`) | Casos de Uso / RBs / ADRs Relacionados | Escopo |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `PROTOTIPAGEM_001` | `EDTS-252` | **Home / Feed Principal** | `modulo-catalogo-busca` | `UC-01`, `STY001`, `ADR-18`, `ADR-20` | `mvp-banca` |
| `PROTOTIPAGEM_002` | `EDTS-253` | **Central de Notificações** | `modulo-chat-propostas` | `STY002`, `ADR-16`, `ADR-25` | `mvp-banca` |
| `PROTOTIPAGEM_003` | `EDTS-254` | **Criar Anúncio (Etapa 1: Fotos + Scanner IA)** | `modulo-anuncio-midia`, `modulo-scanner-visao` | `UC-05`, `RB-01`, `RB-02`, `ADR-01`, `ADR-11`, `ADR-12`, `ADR-27` | `mvp-banca` |
| `PROTOTIPAGEM_004` | `EDTS-255` | **Criar Anúncio (Etapa 2: Detalhes e Sugestão IA)** | `modulo-anuncio-midia`, `modulo-scanner-visao` | `UC-05`, `RF-03`, `RF-04`, `ADR-01`, `ADR-12`, `ADR-19` | `mvp-banca` |
| `PROTOTIPAGEM_005` | `EDTS-256` | **Criar Anúncio (Etapa 3: Preço e Entrega)** | `modulo-anuncio-midia` | `UC-05`, `STY005`, `ADR-19` | `mvp-banca` |
| `PROTOTIPAGEM_006` | `EDTS-257` | **Criar Anúncio (Etapa 4: Revisão e Publicação)** | `modulo-anuncio-midia` | `UC-05`, `STY006`, `ADR-02`, `ADR-13` | `mvp-banca` |
| `PROTOTIPAGEM_007` | `EDTS-258` | **Meus Anúncios** | `modulo-anuncio-midia` | `STY007`, `ADR-18` | `mvp-banca` |
| `PROTOTIPAGEM_008` | `EDTS-259` | **Editar Anúncio** | `modulo-anuncio-midia` | `STY008`, `ADR-13`, `ADR-19` | Core |
| `PROTOTIPAGEM_009` | `EDTS-260` | **Pausar/Reativar Anúncio** | `modulo-anuncio-midia` | `STY009`, `ADR-13` | Core |
| `PROTOTIPAGEM_010` | `EDTS-261` | **Excluir Anúncio** | `modulo-anuncio-midia` | `STY010`, `ADR-13` | Core |
| `PROTOTIPAGEM_011` | `EDTS-262` | **Estatísticas do Anúncio** | `modulo-anuncio-midia` | `STY011`, `ADR-18` | Core |
| `PROTOTIPAGEM_012` | `EDTS-263` | **Anúncios Favoritos** | `modulo-catalogo-busca` | `STY012`, `ADR-18` | Core |
| `PROTOTIPAGEM_013` | `EDTS-264` | **Comparar Anúncios** | `modulo-catalogo-busca` | `UC-02`, `RF-02`, `STY013`, `ADR-18` | Core |
| `PROTOTIPAGEM_014` | `EDTS-265` | **Busca Avançada** | `modulo-catalogo-busca` | `UC-01`, `STY014`, `ADR-08`, `ADR-18` | `mvp-banca` |
| `PROTOTIPAGEM_015` | `EDTS-266` | **Resultados de Busca** | `modulo-catalogo-busca` | `UC-01`, `STY015`, `ADR-18`, `ADR-20` | `mvp-banca` |
| `PROTOTIPAGEM_016` | `EDTS-267` | **Detalhes do Anúncio** | `modulo-catalogo-busca` | `UC-01`, `STY016`, `ADR-18`, `ADR-20` | `mvp-banca` |
| `PROTOTIPAGEM_017` | `EDTS-268` | **Perfil do Vendedor (Visão Comprador)** | `modulo-auth-perfil` | `STY017`, `RB-06`, `ADR-09` | Core |
| `PROTOTIPAGEM_018` | `EDTS-269` | **Categorias de Hardware** | `modulo-catalogo-busca` | `STY018`, `ADR-01`, `ADR-08` | Core |
| `PROTOTIPAGEM_019` | `EDTS-270` | **Filtro por Localização (Mapa PostGIS)** | `modulo-catalogo-busca`, `modulo-logistica-qrcode` | `STY019`, `RB-06`, `ADR-08`, `ADR-26` | Core |
| `PROTOTIPAGEM_020` | `EDTS-271` | **Scanner de Código de Barras / QR Code (`Ed25519`)** | `modulo-logistica-qrcode` | `UC-11`, `RB-07`, `ADR-23`, `ADR-24` | `mvp-banca` |
| `PROTOTIPAGEM_021` | `EDTS-272` | **Histórico de Preços** | `modulo-catalogo-busca` | `STY021`, `ADR-04`, `ADR-18` | Core |
| `PROTOTIPAGEM_022` | `EDTS-273` | **Chat de Negociação (Chat Cego Anti-Fuga)** | `modulo-chat-propostas`, `modulo-antifuga-pii` | `UC-09`, `RB-05`, `RB-15`, `ADR-02`, `ADR-18` | `mvp-banca` |
| `PROTOTIPAGEM_023` | `EDTS-274` | **Enviar Proposta** | `modulo-chat-propostas` | `UC-08`, `STY023`, `ADR-14` | `mvp-banca` |
| `PROTOTIPAGEM_024` | `EDTS-275` | **Propostas Recebidas** | `modulo-chat-propostas` | `UC-08`, `RB-03 (48h)`, `STY024`, `ADR-16` | `mvp-banca` |
| `PROTOTIPAGEM_025` | `EDTS-276` | **Agendar Entrega/Retirada (Ponto de Encontro)** | `modulo-logistica-qrcode` | `UC-10`, `RB-06`, `STY025`, `ADR-23`, `ADR-26` | `mvp-banca` |
| `PROTOTIPAGEM_026` | `EDTS-277` | **Confirmação de Entrega Presencial** | `modulo-logistica-qrcode` | `UC-11`, `RB-07`, `STY026`, `ADR-14`, `ADR-23` | `mvp-banca` |
| `PROTOTIPAGEM_027` | `EDTS-278` | **Rastreamento de Encontro / Rota** | `modulo-logistica-qrcode` | `STY027`, `ADR-23`, `ADR-26` | Core |
| `PROTOTIPAGEM_028` | `EDTS-279` | **Checkout / Pagamento (Retenção em Escrow)** | `modulo-checkout-escrow` | `UC-10`, `RB-04`, `STY028`, `ADR-03`, `ADR-14` | `mvp-banca` |
| `PROTOTIPAGEM_029` | `EDTS-280` | **Confirmação de Pedido** | `modulo-checkout-escrow` | `STY029`, `ADR-03`, `ADR-14` | `mvp-banca` |
| `PROTOTIPAGEM_030` | `EDTS-281` | **Meus Pedidos** | `modulo-checkout-escrow` | `STY030`, `ADR-03`, `ADR-18` | `mvp-banca` |
| `PROTOTIPAGEM_031` | `EDTS-282` | **Detalhes do Pedido** | `modulo-checkout-escrow` | `STY031`, `ADR-03` | Core |
| `PROTOTIPAGEM_032` | `EDTS-283` | **Solicitar Garantia (Janela de 7 Dias)** | `modulo-checkout-escrow`, `modulo-disputas-arbitragem` | `UC-12`, `RB-04`, `STY032`, `ADR-03`, `ADR-06` | Core |
| `PROTOTIPAGEM_033` | `EDTS-284` | **Acompanhar Garantia** | `modulo-checkout-escrow`, `modulo-disputas-arbitragem` | `STY033`, `ADR-03`, `ADR-06` | Core |
| `PROTOTIPAGEM_034` | `EDTS-285` | **Abrir Disputa (Upload de Laudo/Evidências)** | `modulo-disputas-arbitragem` | `UC-12`, `RB-04`, `RB-08`, `ADR-03`, `ADR-06`, `ADR-11` | `mvp-banca` |
| `PROTOTIPAGEM_035` | `EDTS-286` | **Detalhes da Disputa / Arbitragem** | `modulo-disputas-arbitragem` | `UC-12`, `ADR-05`, `ADR-06` | `mvp-banca` |
| `PROTOTIPAGEM_036` | `EDTS-287` | **Cancelar Pedido** | `modulo-checkout-escrow` | `STY036`, `ADR-03`, `ADR-10` | Core |
| `PROTOTIPAGEM_037` | `EDTS-288` | **Avaliar Transação** | `modulo-checkout-escrow` | `STY037`, `ADR-08` | Core |
| `PROTOTIPAGEM_038` | `EDTS-289` | **Carteira Digital (Saldo Materializado & Extrato FIFO)** | `modulo-carteira-ledger` | `UC-06`, `RB-10`, `STY038`, `ADR-10`, `ADR-18` | `mvp-banca` |
| `PROTOTIPAGEM_039` | `EDTS-290` | **Depositar na Carteira** | `modulo-carteira-ledger` | `STY039`, `ADR-10`, `ADR-14` | Core |
| `PROTOTIPAGEM_040` | `EDTS-291` | **Sacar da Carteira** | `modulo-carteira-ledger` | `STY040`, `ADR-03`, `ADR-10`, `ADR-14` | Core |
| `PROTOTIPAGEM_041` | `EDTS-292` | **Verificação Hardware Captcha (Gamificação IA)** | `modulo-scanner-visao`, `modulo-carteira-ledger` | `UC-06`, `RB-10`, `ADR-10`, `ADR-12`, `ADR-21` | `mvp-banca` |
| `PROTOTIPAGEM_042` | `EDTS-293` | **Criar Leilão** | `modulo-leilao-lances` | `UC-07`, `RB-09`, `STY042`, `ADR-15` | `mvp-banca` |
| `PROTOTIPAGEM_043` | `EDTS-294` | **Participar de Leilão (Tempo Real + Anti-Sniping)** | `modulo-leilao-lances` | `UC-07`, `RB-09`, `STY043`, `ADR-15`, `ADR-18` | `mvp-banca` |
| `PROTOTIPAGEM_044` | `EDTS-295` | **Impulsionar Anúncio (Boost com Moedas)** | `modulo-anuncio-midia`, `modulo-carteira-ledger` | `STY044`, `RB-10`, `ADR-10` | Core |
| `PROTOTIPAGEM_045` | `EDTS-296` | **Sobre o Steely** | `institucional` | `STY045`, `ADR-20` | Complementar |
| `PROTOTIPAGEM_046` | `EDTS-297` | **Termos de Uso** | `institucional` | `STY046`, `ADR-07`, `ADR-20` | Complementar |
| `PROTOTIPAGEM_047` | `EDTS-298` | **Política de Privacidade (LGPD)** | `institucional` | `STY047`, `ADR-07`, `ADR-20` | Complementar |
| `PROTOTIPAGEM_048` | `EDTS-299` | **Central de Ajuda / FAQ** | `institucional` | `STY048`, `ADR-20` | Complementar |
| `PROTOTIPAGEM_049` | `EDTS-300` | **Mapa de Ecopontos (Descarte Certificado)** | `modulo-esg-daas`, `modulo-logistica-qrcode` | `UC-13`, `STY049`, `ADR-22`, `ADR-26` | `mvp-banca` |
| `PROTOTIPAGEM_050` | `EDTS-301` | **Dashboard ESG Pessoal e Global** | `modulo-esg-daas` | `UC-14`, `STY050`, `ADR-22` | `mvp-banca` |
| `PROTOTIPAGEM_051` | `EDTS-302` | **Doar para ONG / Instituição Parceira** | `modulo-esg-daas` | `UC-13`, `STY051`, `ADR-22` | `mvp-banca` |
| `PROTOTIPAGEM_052` | `EDTS-303` | **Meu Perfil** | `modulo-auth-perfil` | `STY052`, `ADR-08`, `ADR-09` | Core |
| `PROTOTIPAGEM_053` | `EDTS-304` | **Editar Perfil** | `modulo-auth-perfil` | `STY053`, `ADR-19` | Core |
| `PROTOTIPAGEM_054` | `EDTS-305` | **Configurações de Segurança** | `modulo-auth-perfil` | `STY054`, `ADR-09`, `ADR-21`, `ADR-24` | Core |
| `PROTOTIPAGEM_055` | `EDTS-306` | **Avaliar Usuário** | `modulo-auth-perfil` | `STY055`, `ADR-08` | Core |
| `PROTOTIPAGEM_056` | `EDTS-307` | **Solicitar Exclusão de Conta (Quarentena LGPD 30d)** | `modulo-auth-perfil` | `UC-16`, `STY056`, `ADR-07` | Core |
| `PROTOTIPAGEM_057` | `EDTS-308` | **Realizar Denúncia** | `modulo-disputas-arbitragem` | `STY057`, `ADR-02`, `ADR-06` | Core |
| `PROTOTIPAGEM_058` | `EDTS-309` | **Minhas Denúncias (Histórico)** | `modulo-disputas-arbitragem` | `STY058`, `ADR-06` | Core |
| `PROTOTIPAGEM_059` | `EDTS-310` | **Notificação de Sanção / Moderação** | `modulo-disputas-arbitragem` | `RB-05`, `ADR-02`, `ADR-05`, `ADR-25` | Core |
