# Termo de Abertura do Projeto (TAP) — Steely

> **Arquivo Original:** [`originais/TAP_Steely.pdf`](originais/TAP_Steely.pdf)  
> **Projeto:** Steely — Ecossistema Circular de Hardware com Triagem por IA  
> **Disciplina:** Escola de TI · Engenharia de Software · UniCesumar (Turma B — Equipe 6)

---

## 1. Descrição do Projeto
Desenvolvimento da plataforma **Steely**, um ecossistema digital para negociação, doação e reciclagem de hardware de TI. Utiliza inteligência artificial (**Scanner IA**) para triagem técnica, gamificação (**moedas virtuais**) para engajamento da comunidade (**Hardware Captcha** e **Laudos Técnicos**) e logística otimizada com validação presencial por **QR Code Ed25519** para economia circular.

## 2. Objetivo do Projeto
Criar uma plataforma web e mobile (Android) segura e eficiente para troca, comercialização e doação de componentes de TI, promovendo a sustentabilidade (**ESG**), garantindo a integridade das peças através de laudos técnicos, custódia simulada de 7 dias (*escrow*) e validação comunitária, e facilitando a conexão entre compradores, vendedores e instituições verificadas (ONGs e escolas).

## 3. Justificativa
Resolver a falta de transparência e assimetria de informação no mercado de hardware usado e o descarte ineficiente de componentes eletrônicos (*e-waste*). O projeto é necessário para promover práticas ESG mensuráveis, gerar inteligência de dados anonimizada (**DaaS** com *k-anonimato* `k ≥ 30`) sobre durabilidade e falhas crônicas, e apoiar instituições sociais e educacionais através do **Mural Institucional**.

## 4. Alinhamento Estratégico
Foco em sustentabilidade ambiental (economia circular), transformação digital com Visão Computacional embarcada/isolada em custo zero (`ONNX Runtime INT8` + `FAISS`), suporte ao ecossistema educacional/social e geração de inteligência de mercado com proteção de privacidade (LGPD).

## 5. Critérios de Sucesso
- Implementação e rastreabilidade dos Requisitos Funcionais (`RF-01` a `RF-21`) e Não Funcionais (`RNF-01` a `RNF-13`).
- Manutenção de **Trust Score** de elegibilidade para operações críticas (`≥ 70%`).
- Adesão ativa ao ciclo de aprendizado contínuo (**Scanner IA**, **Hardware Captcha** e **Laudos Técnicos**).
- Segurança transacional nas trocas presenciais via **QR Code Ed25519 offline** (`≤ 150 ms`) e custódia de 7 dias (**Escrow Simulado**).

## 6. Escopo
Desenvolvimento e especificação arquitetural dos módulos:
1. **Identidade, KYC, 2FA, Sessões, Trust Score e Exclusão com Carência de 30 dias (LGPD)** (`STY001–STY012`, `ADR-07`, `ADR-21`).
2. **Montador de Setup, Cálculo de Desempenho/Gargalo e Tendências** (`STY013–STY015`).
3. **Catálogo, Publicação de Oferta (Facade), Itens Compostos (Composite), Scanner IA em 4 Estágios e Boost** (`STY016–STY020`, `ADR-01`, `ADR-11`, `ADR-12`, `ADR-27`).
4. **Chat Interno com Censura Anti-Fuga (Proxy), Propostas de Lote, Reserva de 48 h, Agendamento, Rota Offline e Entrega via QR Code Ed25519** (`STY021–STY029`, `STY032`, `STY038`, `ADR-02`, `ADR-23`, `ADR-24`, `ADR-26`).
5. **Pós-Venda, Laudo Técnico, Custódia Simulada de 7 dias (Escrow) e Arbitragem de Disputas com Dupla Aprovação** (`STY030–STY035`, `ADR-03`, `ADR-06`).
6. **Carteira e Ledger Imutável FIFO de Moedas Virtuais e Leilões com Anti-Sniping** (`STY036–STY037`, `STY042–STY045`, `ADR-10`, `ADR-14`, `ADR-15`).
7. **Mural Institucional (ONGs/Escolas) e Sugestão de Ecopontos** (`STY039–STY041`, `STY057–STY058`).
8. **Governança, Moderação, Trilha de Auditoria Imutável (Hash Chain), Métricas ESG e Relatórios DaaS (`k ≥ 30`)** (`STY046–STY056`, `ADR-04`, `ADR-05`, `ADR-22`).

## 7. Não Escopo
- Conversão de moedas virtuais para dinheiro real (*fiat*) (`RB-09`, `C3` da Matriz CSD).
- Processamento financeiro real em gateways bancários externos (a custódia financeira é operada como saldo contábil simulado auditável no schema `escrow` — `ADR-03`).

## 8. Premissas
- Disponibilidade de imagens e especificações de referência para o catálogo e motor do Scanner IA.
- Validação de perfis institucionais e vendedores/compradores via KYC.
- Engajamento da comunidade na rotulagem gamificada (Hardware Captcha) e emissão de laudos pós-compra.

## 9. Restrições
- **Orçamento R$ 0 (Planos Gratuitos):** Supabase Free (Core + DaaS), Render Free (FastAPI), Cloudflare Pages + Turnstile + WAF, Hugging Face Spaces Free (Worker ONNX) e Google Routes API / Maps SDK dentro da franquia gratuita.
- **Conformidade com Regras de Negócio e LGPD:** KYC obrigatório para leilões/lotes/mural (`RB-01`), bloqueio de materiais perigosos (`RB-02`), sigilo do endereço exato até a reserva com agendamento ativo (`RB-06`, `ADR-09`), censura de contatos (`RB-15`, `ADR-02`) e carência de 30 dias para exclusão (`ADR-07`).
- **Prazo:** Entrega final até **23/11/2026** (com submissão de artefatos em 02/11/2026).

## 10. Riscos de Alto Nível
- Fraudes em transações e disputas pós-entrega (mitigado por QR Code Ed25519, Escrow de 7 dias, rubrica de 5 critérios e dupla aprovação de moderadores — `ADR-03`, `ADR-06`).
- *No-Show* em agendamentos presenciais (mitigado por lembretes push via `pg_cron` + tolerância de 60 min + política de 3 strikes — `RB-05`, `ADR-16`, `ADR-25`).
- Falha ou latência no reconhecimento do Scanner IA (mitigado pelo pipeline multimodal de 4 estágios + 3 faixas de confiança calibradas + *Circuit Breaker* de 3,5 s com fallback manual — `ADR-01`, `ADR-12`).
- Reidentificação em dados estatísticos comercializados (mitigado por *k-anonimato* `k ≥ 30` transações e `≥ 3` vendedores distintos no Projeto 2 isolado — `ADR-04`).

## 11. Cronograma Macro e Orçamento
- **Início:** 14/08/2026 · **Término:** 23/11/2026
- **Reuniões de Alinhamento:** Semanais (Sábados e Domingos) com toda a equipe.
- **Orçamento de Ordem de Grandeza:** **R$ 0,00** (100% em planos gratuitos de infraestrutura).

## 12. Partes Interessadas e Equipe de Desenvolvimento

| Parte Interessada | Papel / Representante | Relacionamento com o Projeto |
| --- | --- | --- |
| **Vendedor** | Utilizador Primário | Publicação de ofertas, vendas e doações |
| **Comprador** | Utilizador Primário | Busca, montagem de setup, compra e avaliação técnica |
| **Instituição** | Representante ONG / Escola | Solicitação e recebimento de doações no Mural Institucional |
| **Comunidade** | Avaliadores / Técnicos Parceiros | Validação no Hardware Captcha e emissão de Laudos Técnicos |
| **Administrador / Moderador** | Back-office da Plataforma | Moderação, arbitragem em dupla aprovação e relatórios DaaS |
| **UniCesumar** | Instituição de Ensino (Prof. Enderson Menezes) | Supervisão acadêmica e avaliação do projeto |

### Equipe de Desenvolvimento (Gestão Compartilhada)
| Integrante | Responsabilidades Arquiteturais (ADRs) |
| --- | --- |
| **Augusto Palma Guglielmi** | Regras Financeiras, Privacidade e Governança (`ADR-03` a `ADR-07`: Escrow Simulado, DaaS `k ≥ 30`, Logs Imutáveis, Arbitragem e Exclusão LGPD 30 dias) |
| **Fabrício Notoya Thomas** | Visão Computacional, Segurança, Dados, Ledger e Mídia (`ADR-01`, `ADR-02` e `ADR-08` a `ADR-12`: Motor do Scanner IA, Censura Anti-Fuga, Banco Principal, Autorização RBAC/ABAC/RLS, Ledger FIFO de Moedas, Storage de Imagens e Limiares do Scanner) |
| **Pietro Pasqual Silva** | Arquitetura Frontend Web, Schemas, A11y, Captcha e ESG (`ADR-18` a `ADR-22`: TanStack Query + Zustand, Zod + Design System, Vite + WCAG 2.1 AA, Cloudflare Turnstile e Painel ESG) |
| **Rafael Tudela Rizental** | Arquitetura Mobile Android / Expo e Offline-First (`ADR-23` a `ADR-27`: WatermelonDB Offline-First, `expo-secure-store`, Notificações Push FCM, Google Routes API + Mapas e Compressão de Imagem) |
| **Thiago Lopes Martins** | Contratos de API, Concorrência, Jobs e Qualidade/Testes (`ADR-13` a `ADR-17`: OpenAPI 3.1 + RFC 9457, Idempotência, Concorrência de Lances, Agendamento `pg_cron` + Outbox e Pirâmide de Testes Orientada a Risco) |
