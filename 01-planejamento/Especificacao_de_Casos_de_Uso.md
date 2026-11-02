# Especificação de Casos de Uso e User Stories — Projeto Steely

> **Arquivos Originais:** [`originais/Documento_de_Casos_de_Uso.pdf`](originais/Documento_de_Casos_de_Uso.pdf) · [`originais/Especificacao_Casos_de_Uso_Steely.xlsx`](originais/Especificacao_Casos_de_Uso_Steely.xlsx)

Este documento consolida em Markdown tanto os **16 Casos de Uso Macro (`UC-01` a `UC-16`)** quanto todas as **61 abas da planilha detalhada de Especificação de Casos de Uso (`STYG` e `STY001` a `STY058`)**.

---

## Parte I — Casos de Uso Macro (`UC-01` a `UC-16`)

| Código | Caso de Uso | Atores Principais | Atores Secundários | Resumo do Fluxo Principal |
| --- | --- | --- | --- | --- |
| **UC-01** | Cadastrar Utilizador | Vendedor, Comprador, Instituição | Sistema | Utilizador acessa a tela de cadastro, escolhe e-mail ou login social, informa os dados e cria a conta (`STY001`). |
| **UC-02** | Utilizar Montador de Setup e Tendências | Vendedor, Comprador | Sistema | Utilizador seleciona peça inicial no Construtor de Setup; sistema filtra peças compatíveis à venda, calcula custo/desempenho/gargalo e exibe tendência de preço (`STY013`–`STY015`). |
| **UC-03** | Publicar Oferta (com Scanner IA) | Vendedor | Sistema (IA) | Vendedor classifica `PC Montado` ou `Peça Avulsa` e condição; opta pelo Scanner IA (tira fotos, IA identifica SKU e preenche ficha técnica, creditando moedas se `≥ 80%`) ou modo manual (`STY016`, `STY017`). |
| **UC-04** | Filtrar Ofertas por Localização | Comprador | Sistema | Comprador define raio geográfico e filtros; sistema retorna ofertas priorizando compatibilidade e mantendo endereço exato em sigilo (`STY020`, `RB-06`). |
| **UC-05** | Resolver Hardware Captcha | Utilizador (Comunidade) | Sistema | Utilizador rotula imagens de hardware (controle + pendente); havendo consenso e acerto do controle, recebe moedas virtuais e alimenta o dataset da IA (`STY046`, `STY047`). |
| **UC-06** | Confirmar Transação via QR Code | Comprador, Vendedor | Sistema | No encontro presencial, o vendedor escaneia o QR Code `Ed25519` do comprador (validação offline `≤ 150 ms`), registrando a entrega e retendo o valor no `escrow` por 7 dias (`STY027`, `STY028`). |
| **UC-07** | Preencher Laudo Técnico Pós-Compra | Comprador / Técnico | Sistema | Após a entrega, comprador/técnico informa diagnóstico da peça com S/N e vídeo; sistema cruza com fotos originais e libera custódia/cashback ou abre disputa (`STY030`). |
| **UC-08** | Participar em Leilão Exclusivo | Utilizador (Vendedor/Comprador) | Sistema | Utilizador com KYC, `Trust Score ≥ 70` e método de pagamento dá lance (bloqueando 5 moedas em `BID_HOLD` e registrando lance em centavos com *anti-sniping* de +120 s nos últimos 60 s) (`STY036`, `STY037`). |
| **UC-09** | Gerar Relatórios Gerenciais (DaaS) | Administrador / Cliente B2B | Sistema | Sistema agrega histórico no Projeto 2 com *k-anonimato* (`k ≥ 30` transações e `≥ 3` vendedores por recorte) e exporta relatórios sobre preços e taxa de falha (`STY053`, `ADR-04`). |
| **UC-10** | Impulsionar Oferta (Boost) | Vendedor | Sistema | Vendedor destaca oferta ativa mediante queima de moedas virtuais ou cota institucional gratuita (`STY018`). |
| **UC-11** | Trocar Mensagens no Chat Interno | Vendedor, Comprador | Sistema | Utilizadores conversam sobre a oferta; o `ProxyCensuraMensagem` bloqueia contatos externos/PII (`422`) antes da reserva confirmada (`STY021`–`STY024`, `ADR-02`). |
| **UC-12** | Agendar Recolha (*Time Slots*) | Vendedor, Comprador | Sistema | Após a reserva, comprador seleciona janela de horário e ponto de encontro; vendedor confirma dentro do prazo (`STY025`, `STY026`). |
| **UC-13** | Gerar Rota de Recolha | Comprador, Instituição | Sistema | Sistema calcula a rota via Google Routes API no FastAPI para agendamentos confirmados e mantém a polyline em cache offline no WatermelonDB (`STY029`, `ADR-26`). |
| **UC-14** | Enviar Proposta para Lote (*Bulk*) | Comprador, Instituição | Vendedor | Utilizador envia proposta de valor para oferta do tipo `Lote` (validade 24 h); vendedor aceita, recusa ou envia contraproposta (`STY038`). |
| **UC-15** | Publicar no Mural Institucional | Instituição (ONG/Escola) | Sistema | Instituição com CNPJ/KYC verificado publica pedido de doação de hardware e recebe impulsionamento gratuito automático (`STY039`–`STY041`, `RB-12`). |
| **UC-16** | Moderar Plataforma | Administrador / Moderador | Sistema | Moderadores analisam denúncias, aplicam sanções proporcionais (exigindo dupla aprovação para banimento ou estorno `> R$ 500,00`) e auditam logs (`STY049`–`STY052`, `STY056`). |

---

## Parte II — Especificação Completa por User Story (`Especificacao_Casos_de_Uso_Steely.xlsx`)

### Aba: `Casos de Uso`

| Caso de Uso | Atores | Categoria | Dados Preliminares | Tipo Aplicação | STY |
| --- | --- | --- | --- | --- | --- |
| Realizar cadastro | Visitante | CADASTRO MÉDIO | E-mail, CPF, Termos de Uso | Web-Consumidor-Final | 001 |
| Realizar login | Visitante | PROCESSO SIMPLES |  | Web-Consumidor-Final | 002 |
| Login por serviços (OAuth / redes sociais) | Visitante | PROCESSO MÉDIO | Provedores OAuth habilitados | Web-Consumidor-Final | 003 |
| Autenticação por captcha (ao comprar, logar e em formulários) | Visitante/ Usuário | PROCESSO SIMPLES | Regras de acionamento por tipo de operação | Web-Consumidor-Final | 004 |
| Recuperação de conta | Visitante | PROCESSO MÉDIO |  | Web-Consumidor-Final | 005 |
| Requisitar código de login | Visitante | PROCESSO SIMPLES |  | Web-Consumidor-Final | 006 |
| Setup de 2FA | Usuário Autenticado | PROCESSO MÉDIO | Métodos de 2FA suportados | Web-Consumidor-Final | 007 |
| Alterar senha | Usuário Autenticado | PROCESSO SIMPLES |  | Web-Consumidor-Final | 008 |
| Deslogar | Usuário Autenticado | PROCESSO SIMPLES |  | Web-Consumidor-Final | 009 |
| Requisitar deleção de conta | Usuário Autenticado | PROCESSO MÉDIO | Prazo de carência e regras de retenção legal | Web-Consumidor-Final | 010 |
| Ver perfil | Usuário | PROCESSO SIMPLES |  | Web-Consumidor-Final | 011 |
| Editar perfil | Usuário Autenticado | CADASTRO SIMPLES | Segue o fluxo padrão do Caso de Uso <Manter Geral> | Web-Consumidor-Final | STYG |
| Avaliar usuário | Usuário (Comprador/ Vendedor) | PROCESSO SIMPLES | Prazo para avaliação após a transação | Web-Consumidor-Final | 012 |
| Montador de setup | Usuário | PROCESSO COMPLEXO | Catálogo de componentes e regras de compatibilidade | Web-Consumidor-Final | 013 |
| Cálculo de setup | Usuário | PROCESSO COMPLEXO | Base de benchmarks e perfis de carga | Web-Consumidor-Final | 014 |
| Tendências de setup | Usuário | PROCESSO MÉDIO | Histórico de montagens e de preços | Web-Consumidor-Final | 015 |
| Publicar oferta | Usuário (Vendedor) | CADASTRO COMPLEXO | Categorias, estados de conservação, regras de anúncio e limites de imagem | Web-Consumidor-Final | 016 |
| Editar oferta | Usuário (Vendedor) | CADASTRO MÉDIO | Segue o fluxo padrão do Caso de Uso <Manter Geral> | Web-Consumidor-Final | STYG |
| Scanner IA | Usuário (Vendedor) | PROCESSO COMPLEXO | Modelo de reconhecimento de hardware | Web-Consumidor-Final | 017 |
| Impulsão de oferta (pago / ONG) | Usuário (Vendedor)/ ONG | PROCESSO MÉDIO | Planos de impulsionamento e cota gratuita para ONG | Web-Consumidor-Final | 018 |
| Alterar status do anúncio (pausar / reabrir) | Usuário (Vendedor) | PROCESSO MÉDIO | Prazo máximo de pausa e prazo de reabertura | Web-Consumidor-Final | 019 |
| Buscar e filtrar ofertas | Usuário | PROCESSO MÉDIO | Índice de busca textual, árvore de categorias, faixas de preço e raio padrão | Web-Consumidor-Final | 020 |
| Enviar mensagem | Usuário | PROCESSO MÉDIO | Formatos e tamanho máximo de anexo permitidos | Web-Consumidor-Final | 021 |
| Configurar mensagem automática de vendedor | Usuário (Vendedor) | CADASTRO SIMPLES |  | Web-Consumidor-Final | 022 |
| Deleção de mensagem (usuário) | Usuário | PROCESSO SIMPLES | Prazo para exclusão para todos | Web-Consumidor-Final | 023 |
| Encerramento de chat (usuário) | Usuário | PROCESSO SIMPLES |  | Web-Consumidor-Final | 024 |
| Agendar horário | Usuário (Comprador) | PROCESSO MÉDIO | Agenda de disponibilidade do vendedor e pontos seguros | Web-Consumidor-Final | 025 |
| Cancelar agendamento | Usuário (Comprador/ Vendedor) | PROCESSO SIMPLES | Prazo mínimo de antecedência e política de reputação | Web-Consumidor-Final | 026 |
| Geração de QR Code | Usuário (Comprador/ Vendedor) | PROCESSO MÉDIO | Prazo de validade do código | Web-Consumidor-Final | 027 |
| Escanear QR Code | Usuário (Comprador/ Vendedor) | PROCESSO MÉDIO |  | Mobile-Consumidor-Final | 028 |
| Gerar e consultar rota | Usuário | PROCESSO MÉDIO | Serviço de mapas, pontos seguros e dados de rota armazenados localmente | Mobile-Consumidor-Final | 029 |
| Laudo técnico | Usuário (Comprador)/ Técnico Parceiro | PROCESSO COMPLEXO | Rede de técnicos parceiros e tabela de testes por categoria | Web-Consumidor-Final | 030 |
| Solicitar devolução | Usuário (Comprador) | PROCESSO MÉDIO | Prazo de arrependimento e política de devolução | Web-Consumidor-Final | 031 |
| Geração de PDF (comprovante) | Usuário | PROCESSO SIMPLES | Modelo de comprovante | Web-Consumidor-Final | 032 |
| Abrir reclamação | Usuário | PROCESSO MÉDIO | Tipos de reclamação e prazos de resposta | Web-Consumidor-Final | 033 |
| Requisitar escalamento de reclamação | Usuário | PROCESSO MÉDIO | Níveis de atendimento e prazos de escalamento | Web-Consumidor-Final | 034 |
| Encerrar reclamação | Moderador User | PROCESSO MÉDIO | Fundamentos de decisão e sanções aplicáveis | Web-Back-Office | 035 |
| Criação de leilão (admin) | Back-office User | CADASTRO COMPLEXO | Regras de leilão, lotes e taxas | Web-Back-Office | 036 |
| Participar em leilão | Usuário (Comprador) | PROCESSO COMPLEXO | Regras de habilitação e limites de lance | Web-Consumidor-Final | 037 |
| Proposta (lote) | Usuário (Comprador) | PROCESSO MÉDIO | Regras de proposta e prazo de validade | Web-Consumidor-Final | 038 |
| Requisitar cadastro (ONG) | Representante de ONG | CADASTRO COMPLEXO | Documentação exigida para pessoa jurídica | Web-Consumidor-Final | 039 |
| Verificação de ONG (admin) | Back-office User | PROCESSO MÉDIO | Checklist de conformidade documental | Web-Back-Office | 040 |
| Publicação de pedido de doações (ONG) | ONG Verificada | CADASTRO MÉDIO | Categorias de equipamentos aceitos | Web-Consumidor-Final | 041 |
| Verificar moedas (cashback) | Usuário Autenticado | PROCESSO SIMPLES | Regras de crédito e expiração de moedas | Web-Consumidor-Final | 042 |
| Resgatar moedas | Usuário Autenticado | PROCESSO MÉDIO | Valor mínimo de resgate e destinos permitidos | Web-Consumidor-Final | 043 |
| Gastar moedas | Usuário Autenticado | PROCESSO MÉDIO | Serviços elegíveis ao pagamento com moedas | Web-Consumidor-Final | 044 |
| Manter método de pagamento | Usuário Autenticado | CADASTRO MÉDIO | Métodos aceitos, gateway de pagamento e limite de métodos por conta | Web-Consumidor-Final | 045 |
| Hardware Captcha | Usuário | PROCESSO MÉDIO | Banco de imagens e rótulos de componentes | Web-Consumidor-Final | 046 |
| Recolhimento de dados para treino de IA (admin) | Back-office User | PROCESSO COMPLEXO | Política de privacidade, base legal e consentimento | Web-Back-Office | 047 |
| Atualização da IA (admin) | Back-office User | PROCESSO COMPLEXO | Versões de modelo e métricas de aceitação | Web-Back-Office | 048 |
| Realizar denúncia | Usuário | PROCESSO SIMPLES | Motivos de denúncia | Web-Consumidor-Final | 049 |
| Analisar e finalizar denúncia | Moderador User | PROCESSO COMPLEXO | Critérios de análise, políticas de conteúdo e tabela de sanções | Web-Back-Office | 050 |
| Remoção de post (moderação / admin) | Moderador User/ Back-office User | PROCESSO MÉDIO | Motivos de remoção | Web-Back-Office | 051 |
| Censura de dados pessoais em descrições de produtos (moderação) | Moderador User | PROCESSO MÉDIO | Padrões de detecção de dados pessoais | Web-Back-Office | 052 |
| Geração de relatório (admin – DaaS) | Back-office User | PROCESSO COMPLEXO | Catálogo de indicadores e regras de anonimização | Web-Back-Office | 053 |
| Gerar métricas ESG (usuário / site-wide) | Usuário Autenticado/ Back-office User | PROCESSO COMPLEXO | Fatores de conversão, metodologia ESG e período de apuração | Web-Consumidor-Final / Web-Back-Office | 054 |
| Descrição de item (site-wide – falha de mortalidade / defeitos crônicos) | Usuário | PROCESSO COMPLEXO | Base de defeitos recorrentes e taxa de falha por modelo | Web-Consumidor-Final | 055 |
| Checamento de logs (admin) | Back-office User | PROCESSO MÉDIO | Política de retenção e níveis de acesso a logs | Web-Back-Office | 056 |
| Consultar guia informativo | Usuário | PROCESSO MÉDIO | Base de conteúdo editorial e histórico de preços praticados | Web-Consumidor-Final | 057 |
| Sugestão de ecoponto oficial ao usuário caso ele não consiga vender o item (reciclagem) | Usuário (Vendedor) | PROCESSO MÉDIO | Base de ecopontos e pontos de logística reversa | Web-Consumidor-Final | 058 |

### Aba: `User Stories`

| User Story | Narrativa |
| --- | --- |
| Realizar cadastro | Como Visitante preciso criar uma conta na plataforma para poder comprar, vender e avaliar itens de hardware. |
| Realizar login | Como Visitante preciso me autenticar com minhas credenciais para acessar as funcionalidades restritas da minha conta. |
| Login por serviços (OAuth / redes sociais) | Como Visitante preciso entrar na plataforma usando uma conta de rede social para agilizar meu acesso sem criar novas credenciais. |
| Autenticação por captcha (ao comprar, logar e em formulários) | Como plataforma preciso validar que o autor de uma operação sensível é humano para evitar automações maliciosas e fraudes. |
| Recuperação de conta | Como Visitante preciso recuperar o acesso à minha conta quando esqueço a senha para voltar a utilizar a plataforma. |
| Requisitar código de login | Como Visitante preciso receber um código temporário por e-mail para entrar na plataforma sem digitar minha senha. |
| Setup de 2FA | Como Usuário Autenticado preciso habilitar a autenticação em dois fatores para proteger minha conta contra acessos indevidos. |
| Alterar senha | Como Usuário Autenticado preciso alterar minha senha para manter a segurança do meu acesso. |
| Deslogar | Como Usuário Autenticado preciso encerrar minha sessão para impedir o uso da minha conta por terceiros no dispositivo. |
| Requisitar deleção de conta | Como Usuário Autenticado preciso solicitar a exclusão da minha conta e dos meus dados para exercer meu direito de eliminação. |
| Ver perfil | Como Usuário preciso visualizar o perfil de outro usuário para avaliar sua reputação antes de negociar. |
| Editar perfil | Como Usuário Autenticado preciso manter os dados do meu perfil para que minhas informações estejam corretas nas negociações. |
| Avaliar usuário | Como Usuário preciso avaliar a contraparte de uma negociação concluída para contribuir com a reputação da comunidade. |
| Montador de setup | Como Usuário preciso montar um setup selecionando componentes compatíveis para planejar minha compra dentro do orçamento. |
| Cálculo de setup | Como Usuário preciso conhecer o desempenho estimado e o gargalo do setup que montei para decidir onde investir meu dinheiro. |
| Tendências de setup | Como Usuário preciso ver as configurações mais montadas e a variação de preços dos componentes para escolher o melhor momento de comprar. |
| Publicar oferta | Como Vendedor preciso publicar uma oferta de hardware usado, com suas fotos reais, para disponibilizá-la aos compradores da plataforma transmitindo confiança. |
| Editar oferta | Como Vendedor preciso editar minha oferta publicada para corrigir informações e ajustar o preço do item. |
| Scanner IA | Como Vendedor preciso que a plataforma identifique automaticamente meu componente pelas fotos para preencher o anúncio com precisão e sem esforço. |
| Impulsão de oferta (pago / ONG) | Como Vendedor preciso impulsionar minha oferta para aumentar sua visibilidade nos resultados de busca. |
| Alterar status do anúncio (pausar / reabrir) | Como Vendedor preciso pausar e reabrir meu anúncio para interromper e retomar as negociações do item sem perder seu cadastro. |
| Buscar e filtrar ofertas | Como Usuário preciso buscar itens pelo nome e refinar os resultados por localização, categoria e faixa de preço para encontrar rapidamente o hardware compatível com a minha necessidade e o meu orçamento. |
| Enviar mensagem | Como Usuário preciso enviar mensagens e anexos ao anunciante para negociar as condições do item e comprovar seu estado antes da compra. |
| Configurar mensagem automática de vendedor | Como Vendedor preciso configurar uma resposta automática para informar minhas condições de venda assim que um comprador iniciar a conversa. |
| Deleção de mensagem (usuário) | Como Usuário preciso excluir uma mensagem enviada por engano para corrigir a comunicação com a contraparte. |
| Encerramento de chat (usuário) | Como Usuário preciso encerrar uma conversa concluída para organizar minha caixa de mensagens. |
| Agendar horário | Como Comprador preciso agendar um horário e um local com o vendedor para realizar a entrega presencial do item com segurança. |
| Cancelar agendamento | Como Usuário preciso cancelar um agendamento quando não puder comparecer para avisar a contraparte com antecedência. |
| Geração de QR Code | Como Usuário preciso de um código único do encontro para comprovar a entrega e a retirada do item de forma inequívoca. |
| Escanear QR Code | Como Usuário preciso escanear o código da contraparte no momento do encontro para confirmar que a entrega foi realizada. |
| Gerar e consultar rota | Como Usuário preciso gerar a rota até o local do encontro e consultá-la mesmo sem conexão para chegar ao ponto combinado no horário previsto. |
| Laudo técnico | Como Comprador preciso solicitar um laudo técnico do item para confirmar seu funcionamento antes de concluir a compra. |
| Solicitar devolução | Como Comprador preciso solicitar a devolução de um item que não corresponde ao anunciado para reaver o valor pago. |
| Geração de PDF (comprovante) | Como Usuário preciso emitir o comprovante da negociação em PDF para guardar o registro da transação realizada. |
| Abrir reclamação | Como Usuário preciso abrir uma reclamação sobre uma negociação problemática para que a plataforma medie o conflito. |
| Requisitar escalamento de reclamação | Como Usuário preciso escalar minha reclamação quando discordo da análise inicial para que o caso seja revisto por uma instância superior. |
| Encerrar reclamação | Como Moderador preciso encerrar uma reclamação com uma decisão fundamentada para concluir a mediação entre as partes. |
| Criação de leilão (admin) | Como Back-office User preciso criar leilões de lotes de hardware para viabilizar a venda de grandes volumes na plataforma. |
| Participar em leilão | Como Comprador preciso dar lances em um leilão para adquirir lotes de hardware por um valor competitivo. |
| Proposta (lote) | Como Comprador preciso enviar uma proposta por um lote de itens para negociar um valor melhor na compra em conjunto. |
| Requisitar cadastro (ONG) | Como Representante de ONG preciso solicitar o cadastro da minha organização para receber doações de equipamentos pela plataforma. |
| Verificação de ONG (admin) | Como Back-office User preciso verificar a documentação das ONGs solicitantes para garantir que apenas organizações legítimas recebam o selo institucional. |
| Publicação de pedido de doações (ONG) | Como ONG Verificada preciso publicar pedidos de doação de equipamentos para receber hardware que atenda aos projetos da organização. |
| Verificar moedas (cashback) | Como Usuário Autenticado preciso consultar meu saldo de moedas e seu histórico para saber quanto tenho disponível para usar. |
| Resgatar moedas | Como Usuário Autenticado preciso resgatar minhas moedas acumuladas para converter o cashback em benefício efetivo. |
| Gastar moedas | Como Usuário Autenticado preciso usar minhas moedas para pagar serviços da plataforma e reduzir meus custos. |
| Manter método de pagamento | Como Usuário Autenticado preciso cadastrar, atualizar e excluir meus métodos de pagamento para contratar serviços na plataforma mantendo minha carteira segura e organizada. |
| Hardware Captcha | Como Usuário preciso resolver desafios de identificação de hardware que, além de comprovar que sou humano, contribuem para o aprendizado da plataforma. |
| Recolhimento de dados para treino de IA (admin) | Como Back-office User preciso extrair conjuntos de dados anonimizados da plataforma para treinar os modelos de reconhecimento de hardware. |
| Atualização da IA (admin) | Como Back-office User preciso promover novas versões dos modelos de IA para melhorar a precisão do reconhecimento de hardware na plataforma. |
| Realizar denúncia | Como Usuário preciso denunciar anúncios, perfis e mensagens irregulares para manter a plataforma segura e confiável. |
| Analisar e finalizar denúncia | Como Moderador preciso analisar as denúncias recebidas e finalizá-las com a decisão e as sanções aplicadas para manter a plataforma segura e encerrar formalmente cada caso. |
| Remoção de post (moderação / admin) | Como Moderador preciso remover conteúdos que violam as políticas da plataforma para proteger os demais usuários. |
| Censura de dados pessoais em descrições de produtos (moderação) | Como Moderador preciso que dados pessoais expostos nas descrições de produtos sejam ocultados para proteger a privacidade dos usuários. |
| Geração de relatório (admin – DaaS) | Como Back-office User preciso gerar relatórios agregados de mercado para fornecer inteligência de dados aos clientes do serviço DaaS. |
| Gerar métricas ESG (usuário / site-wide) | Como Usuário preciso ver o impacto ambiental das minhas negociações e, como Back-office User, apurar as métricas ESG consolidadas da plataforma para acompanhar e comprovar nossa contribuição com a economia circular. |
| Descrição de item (site-wide – falha de mortalidade / defeitos crônicos) | Como Usuário preciso conhecer os defeitos crônicos e a taxa de falha do modelo que pretendo comprar para avaliar o risco da aquisição. |
| Checamento de logs (admin) | Como Back-office User preciso consultar os registros de auditoria da plataforma para investigar incidentes e comprovar a rastreabilidade das operações. |
| Consultar guia informativo | Como Usuário preciso acessar o guia informativo e consultar a faixa de preço praticada de cada modelo para aprender sobre hardware usado e saber se uma oferta está justa. |
| Sugestão de ecoponto oficial ao usuário caso ele não consiga vender o item (reciclagem) | Como Vendedor preciso saber onde descartar corretamente um item que não consegui vender para dar a ele um destino ambientalmente adequado. |

### Aba: `STYG - Manter Geral`

| Nome do Caso de Uso | Manter Geral |
| --- | --- |
| Finalidade/Objetivo: | Caso de uso genérico que descreve o fluxo padrão de manutenção de um cadastro (inclusão, consulta, alteração e inativação). É referenciado pelos casos de uso simples de manutenção, que não repetem este fluxo. |
| Ator(es): | Usuário Autenticado/ Back-office User |
| Pré-Condições: | O ator está autenticado e possui permissão sobre a entidade que será mantida. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa a funcionalidade de manutenção da entidade desejada. |  |
|  | 2. Apresenta a lista dos registros existentes, com os filtros de pesquisa e as ações disponíveis. |
| 3. Pesquisa e seleciona um registro ou aciona a opção de incluir um novo. |  |
|  | 4. Exibe o formulário da entidade, em branco para inclusão ou preenchido com os dados atuais para alteração. |
| 5. Preenche ou altera os campos e confirma a operação. |  |
|  | 6. Valida a obrigatoriedade, o formato e as regras de negócio dos campos informados. |
|  | 7. Valida a unicidade dos dados que não admitem duplicidade. |
|  | 8. Persiste o registro, registra a operação em log e exibe a mensagem de confirmação. |
| 9. Opcionalmente, seleciona um registro e aciona a inativação. |  |
|  | 10. Verifica os vínculos existentes, solicita a confirmação e inativa o registro, preservando o histórico. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se algum campo obrigatório não for informado, destaca os campos pendentes e mantém os dados já preenchidos. |
|  | 2. Se algum dado violar a regra de unicidade, informa a duplicidade e solicita a correção. |
|  | 3. Se o registro possuir vínculos ativos, impede a inativação e apresenta os vínculos impeditivos. |
| 4. Cancela a operação; o sistema descarta as alterações e retorna à listagem. |  |
|  | 5. Se o registro tiver sido alterado por outro ator durante a edição, informa o conflito e apresenta a versão atual. |

### Aba: `STY001 - Realizar Cadastro`

| Nome do Caso de Uso | Realizar cadastro |
| --- | --- |
| Finalidade/Objetivo: | Permitir que um visitante crie uma conta na plataforma, informando seus dados pessoais e credenciais de acesso, com validação de e-mail e aceite dos termos de uso. |
| Ator(es): | Visitante |
| Pré-Condições: | O visitante não possui conta ativa vinculada ao e-mail ou CPF informado. A plataforma está disponível. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa a plataforma e seleciona a opção de criar conta. |  |
|  | 2. Exibe o formulário de cadastro com os campos: nome completo, e-mail, CPF, data de nascimento, senha e confirmação de senha. |
| 3. Preenche os campos obrigatórios do formulário. |  |
| 4. Marca o aceite dos Termos de Uso e da Política de Privacidade. |  |
| 5. Resolve o desafio de captcha e confirma o envio. |  |
|  | 6. Valida o formato e a obrigatoriedade dos campos, a unicidade do e-mail e do CPF e a força da senha. |
|  | 7. Registra a conta com situação 'pendente de verificação' e envia um código de verificação para o e-mail informado. |
| 8. Informa o código de verificação recebido por e-mail. |  |
|  | 9. Valida o código, ativa a conta, credita as moedas de boas-vindas e apresenta a mensagem de cadastro concluído. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se o e-mail ou o CPF já estiver vinculado a uma conta existente, informa a duplicidade e oferece as opções de login e de recuperação de conta. |
|  | 2. Se a senha não atender aos critérios mínimos de segurança, exibe a regra não atendida e mantém os demais dados preenchidos. |
|  | 3. Se os Termos de Uso não forem aceitos, bloqueia o envio e destaca o campo de aceite. |
|  | 4. Se o código de verificação expirar ou for informado incorretamente três vezes, invalida o código e disponibiliza o reenvio. |

### Aba: `STY002 - Realizar Login`

| Nome do Caso de Uso | Realizar login |
| --- | --- |
| Finalidade/Objetivo: | Autenticar o usuário na plataforma por meio de e-mail e senha, iniciando uma sessão válida. |
| Ator(es): | Visitante |
| Pré-Condições: | O usuário possui conta ativa e verificada na plataforma. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa a tela de login. |  |
|  | 2. Exibe os campos de e-mail e senha e as opções alternativas de autenticação. |
| 3. Informa e-mail e senha e confirma. |  |
|  | 4. Valida as credenciais informadas e verifica a situação da conta. |
|  | 5. Caso a conta possua 2FA habilitado, solicita o segundo fator de autenticação. |
| 6. Informa o código do segundo fator. |  |
|  | 7. Cria a sessão do usuário, registra o acesso em log e redireciona para a página inicial autenticada. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se as credenciais estiverem incorretas, exibe mensagem genérica de falha de autenticação sem indicar qual campo está errado. |
|  | 2. Após três tentativas malsucedidas, exige a resolução de captcha antes de nova tentativa. |
|  | 3. Após cinco tentativas malsucedidas, bloqueia temporariamente o acesso à conta e notifica o titular por e-mail. |
|  | 4. Se a conta estiver suspensa ou pendente de verificação, informa a situação e apresenta a ação necessária para regularização. |

### Aba: `STY003 - Login por Servicos`

| Nome do Caso de Uso | Login por serviços (OAuth / redes sociais) |
| --- | --- |
| Finalidade/Objetivo: | Permitir a autenticação do usuário por meio de provedores de identidade externos (OAuth), criando ou vinculando a conta local. |
| Ator(es): | Visitante |
| Pré-Condições: | O provedor de identidade externo está habilitado e disponível. O usuário possui conta ativa no provedor escolhido. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Seleciona, na tela de login, o provedor externo desejado. |  |
|  | 2. Redireciona o usuário para a página de autorização do provedor. |
| 3. Autentica-se no provedor e autoriza o compartilhamento dos dados solicitados. |  |
|  | 4. Recebe o retorno do provedor e valida o token de autorização. |
|  | 5. Verifica se já existe conta local vinculada ao identificador retornado pelo provedor. |
|  | 6. Caso não exista, cria a conta com os dados recebidos e solicita a complementação dos dados obrigatórios ausentes. |
| 7. Complementa os dados obrigatórios e aceita os Termos de Uso, quando solicitado. |  |
|  | 8. Vincula a identidade externa à conta local, cria a sessão e redireciona para a página inicial autenticada. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se o usuário negar a autorização no provedor, retorna à tela de login e informa que o acesso não foi concedido. |
|  | 2. Se o e-mail retornado pelo provedor já pertencer a uma conta local, solicita a autenticação por senha para confirmar a titularidade antes de vincular as identidades. |
|  | 3. Se o provedor estiver indisponível ou o token for inválido, informa a falha e oferece o login por e-mail e senha. |

### Aba: `STY004 - Autenticacao Captcha`

| Nome do Caso de Uso | Autenticação por captcha (ao comprar, logar e em formulários) |
| --- | --- |
| Finalidade/Objetivo: | Validar a natureza humana do autor de operações sensíveis (login, cadastro, compra e envio de formulários) por meio de desafio de captcha. |
| Ator(es): | Visitante/ Usuário |
| Pré-Condições: | A operação em curso está configurada como sensível nas regras de acionamento de captcha. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Submete um formulário ou confirma uma operação sensível. |  |
|  | 2. Avalia os indicadores de risco da sessão (frequência de requisições, reputação de origem e histórico de falhas). |
|  | 3. Apresenta o desafio de captcha correspondente ao nível de risco identificado. |
| 4. Resolve o desafio apresentado. |  |
|  | 5. Valida a resposta junto ao serviço de verificação. |
|  | 6. Libera o prosseguimento da operação original e registra o resultado da validação em log. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se a resposta for inválida, gera um novo desafio e mantém os dados do formulário preenchidos. |
|  | 2. Após três falhas consecutivas, aplica bloqueio temporário à origem e registra o evento para análise de segurança. |
|  | 3. Se o serviço de verificação estiver indisponível, aplica o desafio alternativo interno e registra a indisponibilidade em log. |

### Aba: `STY005 - Recuperacao de Conta`

| Nome do Caso de Uso | Recuperação de conta |
| --- | --- |
| Finalidade/Objetivo: | Permitir que o titular de uma conta recupere o acesso por meio de verificação de identidade e definição de nova senha. |
| Ator(es): | Visitante |
| Pré-Condições: | Existe conta ativa vinculada ao e-mail informado. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Seleciona a opção de recuperação de conta na tela de login. |  |
|  | 2. Solicita o e-mail cadastrado e apresenta desafio de captcha. |
| 3. Informa o e-mail e resolve o captcha. |  |
|  | 4. Envia um link de recuperação com prazo de validade para o e-mail informado e exibe mensagem neutra de confirmação de envio. |
| 5. Acessa o link recebido. |  |
|  | 6. Valida o token do link e apresenta o formulário de definição de nova senha. |
| 7. Informa a nova senha e a confirmação. |  |
|  | 8. Valida os critérios de segurança, atualiza a senha, encerra todas as sessões ativas e notifica o titular por e-mail. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se o e-mail informado não estiver cadastrado, exibe a mesma mensagem neutra de confirmação, sem revelar a existência da conta. |
|  | 2. Se o link estiver expirado ou já utilizado, informa a invalidez e oferece o reenvio. |
|  | 3. Se a conta possuir 2FA habilitado, exige o segundo fator antes de permitir a redefinição da senha. |
|  | 4. Se a nova senha for igual a uma das últimas senhas utilizadas, recusa a alteração e solicita outra. |

### Aba: `STY006 - Requisitar Codigo`

| Nome do Caso de Uso | Requisitar código de login |
| --- | --- |
| Finalidade/Objetivo: | Permitir o acesso à conta por meio de código de uso único enviado ao canal verificado do titular. |
| Ator(es): | Visitante |
| Pré-Condições: | O usuário possui conta ativa com e-mail verificado. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Seleciona a opção de entrar com código na tela de login. |  |
|  | 2. Solicita o e-mail cadastrado e apresenta desafio de captcha. |
| 3. Informa o e-mail e resolve o captcha. |  |
|  | 4. Gera código de uso único com prazo de validade, envia ao e-mail cadastrado e exibe o campo de digitação. |
| 5. Informa o código recebido. |  |
|  | 6. Valida o código, invalida-o para novos usos, cria a sessão e registra o acesso em log. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se o código estiver expirado, informa a expiração e disponibiliza a geração de novo código. |
|  | 2. Se o código for informado incorretamente três vezes, invalida-o e exige nova solicitação. |
|  | 3. Se houver solicitação de novo código antes do intervalo mínimo, informa o tempo restante para nova tentativa. |

### Aba: `STY007 - Setup de 2FA`

| Nome do Caso de Uso | Setup de 2FA |
| --- | --- |
| Finalidade/Objetivo: | Permitir que o usuário habilite, configure ou desabilite o segundo fator de autenticação da sua conta. |
| Ator(es): | Usuário Autenticado |
| Pré-Condições: | O usuário está autenticado e possui e-mail verificado. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa as configurações de segurança da conta e seleciona a opção de autenticação em dois fatores. |  |
|  | 2. Exibe a situação atual do 2FA e os métodos disponíveis (aplicativo autenticador ou código por e-mail). |
| 3. Seleciona o método desejado e confirma. |  |
|  | 4. Gera o segredo e apresenta o QR Code e a chave alternativa para cadastro no aplicativo autenticador. |
| 5. Registra a chave no aplicativo e informa o código gerado para validação. |  |
|  | 6. Valida o código, habilita o 2FA, gera os códigos de recuperação e os apresenta uma única vez. |
| 7. Confirma o armazenamento dos códigos de recuperação. |  |
|  | 8. Registra a alteração em log e notifica o titular por e-mail. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se o código de validação estiver incorreto, mantém o 2FA desabilitado e permite nova tentativa. |
|  | 2. Se o usuário solicitar a desativação do 2FA, exige a senha atual e um código válido antes de concluir. |
|  | 3. Se o usuário abandonar o processo antes da validação, descarta o segredo gerado. |

### Aba: `STY008 - Alterar Senha`

| Nome do Caso de Uso | Alterar senha |
| --- | --- |
| Finalidade/Objetivo: | Permitir que o usuário autenticado substitua a senha atual por uma nova, mediante confirmação da credencial vigente. |
| Ator(es): | Usuário Autenticado |
| Pré-Condições: | O usuário está autenticado e sua conta possui autenticação por senha. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa as configurações de segurança e seleciona a opção de alterar senha. |  |
|  | 2. Exibe os campos de senha atual, nova senha e confirmação da nova senha. |
| 3. Preenche os campos e confirma a alteração. |  |
|  | 4. Valida a senha atual e os critérios de segurança da nova senha. |
|  | 5. Atualiza a credencial, encerra as demais sessões ativas e notifica o titular por e-mail. |
|  | 6. Exibe a confirmação da alteração e registra o evento em log. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se a senha atual estiver incorreta, recusa a alteração e permite nova tentativa. |
|  | 2. Se a nova senha não atender aos critérios mínimos, exibe a regra não atendida. |
|  | 3. Se a nova senha for igual à atual, recusa a alteração e solicita outra. |

### Aba: `STY009 - Deslogar`

| Nome do Caso de Uso | Deslogar |
| --- | --- |
| Finalidade/Objetivo: | Encerrar a sessão ativa do usuário na plataforma, de forma pontual ou em todos os dispositivos. |
| Ator(es): | Usuário Autenticado |
| Pré-Condições: | O usuário possui sessão ativa. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Seleciona a opção de sair no menu da conta. |  |
|  | 2. Solicita a confirmação da saída. |
| 3. Confirma o encerramento da sessão. |  |
|  | 4. Invalida o token da sessão corrente, limpa os dados locais de autenticação e registra o evento em log. |
|  | 5. Redireciona o usuário para a página inicial pública. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
| 1. Seleciona a opção de encerrar a sessão em todos os dispositivos; o sistema invalida todos os tokens ativos da conta e notifica o titular por e-mail. |  |
|  | 2. Se a sessão já estiver expirada, apenas limpa os dados locais e redireciona para a página inicial pública. |

### Aba: `STY010 - Requisitar Delecao`

| Nome do Caso de Uso | Requisitar deleção de conta |
| --- | --- |
| Finalidade/Objetivo: | Registrar a solicitação de exclusão da conta e dos dados pessoais do titular, respeitando as pendências operacionais e as obrigações legais de retenção. |
| Ator(es): | Usuário Autenticado |
| Pré-Condições: | O usuário está autenticado e ciente das consequências da exclusão. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa as configurações da conta e seleciona a opção de excluir conta. |  |
|  | 2. Verifica a existência de pendências (anúncios ativos, transações em andamento, reclamações abertas e saldo de moedas). |
|  | 3. Apresenta o resumo das consequências, das pendências identificadas e do prazo de carência para arrependimento. |
| 4. Confirma a solicitação e informa a senha atual. |  |
|  | 5. Valida a credencial, registra a solicitação com a data de efetivação e encerra as sessões ativas. |
|  | 6. Anonimiza o perfil público, mantém os dados sujeitos à retenção legal e envia a confirmação por e-mail. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se houver transação, leilão ou reclamação em andamento, informa a pendência e impede a solicitação até a sua conclusão. |
|  | 2. Se houver saldo de moedas, alerta sobre a perda do saldo e exige confirmação adicional. |
| 3. Solicita o cancelamento da exclusão dentro do prazo de carência; o sistema reativa a conta e notifica o titular. |  |

### Aba: `STY011 - Ver Perfil`

| Nome do Caso de Uso | Ver perfil |
| --- | --- |
| Finalidade/Objetivo: | Apresentar as informações públicas de um perfil, incluindo reputação, histórico de avaliações, anúncios ativos e métricas de sustentabilidade. |
| Ator(es): | Usuário |
| Pré-Condições: | O perfil consultado existe e não está removido ou suspenso. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Seleciona o nome de um usuário em um anúncio, em um chat ou no resultado de busca. |  |
|  | 2. Recupera os dados públicos do perfil, a nota média de avaliação e o total de negociações concluídas. |
|  | 3. Exibe o perfil com foto, nome de exibição, data de entrada, reputação, selos obtidos e métricas ESG do usuário. |
|  | 4. Lista os anúncios ativos e as avaliações recebidas, ordenadas da mais recente para a mais antiga. |
| 5. Consulta as avaliações e, opcionalmente, aciona as opções de enviar mensagem ou denunciar o perfil. |  |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se o perfil estiver suspenso ou removido, exibe apenas a informação de indisponibilidade, sem os dados do usuário. |
|  | 2. Se o usuário não possuir avaliações, exibe a indicação de perfil sem histórico de negociações. |
|  | 3. Se o visitante não estiver autenticado, oculta os dados de contato e solicita autenticação para as ações interativas. |

### Aba: `STY012 - Avaliar Usuario`

| Nome do Caso de Uso | Avaliar usuário |
| --- | --- |
| Finalidade/Objetivo: | Registrar a avaliação de um usuário após a conclusão de uma negociação, compondo sua nota de reputação pública. |
| Ator(es): | Usuário (Comprador/ Vendedor) |
| Pré-Condições: | Existe uma transação concluída entre os dois usuários e o prazo para avaliação não expirou. O ator ainda não avaliou esta transação. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa o histórico de negociações e seleciona a transação concluída. |  |
|  | 2. Exibe o formulário de avaliação com nota, critérios objetivos (comunicação, pontualidade e fidelidade da descrição) e campo de comentário. |
| 3. Atribui a nota, seleciona os critérios e escreve o comentário. |  |
| 4. Confirma o envio da avaliação. |  |
|  | 5. Valida o conteúdo do comentário quanto a dados pessoais e linguagem ofensiva. |
|  | 6. Registra a avaliação, recalcula a reputação média da contraparte e notifica o avaliado. |
|  | 7. Credita as moedas de recompensa pela avaliação e exibe a confirmação. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se o prazo de avaliação estiver expirado, informa a indisponibilidade e mantém a transação sem avaliação. |
|  | 2. Se o ator já tiver avaliado a transação, apresenta a avaliação registrada e permite apenas a edição dentro do prazo previsto. |
|  | 3. Se o comentário for reprovado na validação de conteúdo, retém a avaliação para moderação e informa o autor. |
| 4. O avaliado contesta a avaliação; o sistema registra a contestação e a encaminha para análise da moderação. |  |

### Aba: `STY013 - Montador de Setup`

| Nome do Caso de Uso | Montador de setup |
| --- | --- |
| Finalidade/Objetivo: | Permitir que o usuário monte uma configuração de hardware selecionando componentes do catálogo e das ofertas ativas, com verificação automática de compatibilidade. |
| Ator(es): | Usuário |
| Pré-Condições: | O catálogo de componentes e as regras de compatibilidade estão atualizados. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa o montador de setup e informa a finalidade de uso e o orçamento pretendido. |  |
|  | 2. Apresenta as categorias de componentes obrigatórias e opcionais e sugere uma configuração inicial compatível com a finalidade informada. |
| 3. Seleciona um componente por categoria, a partir do catálogo ou das ofertas ativas na plataforma. |  |
|  | 4. Verifica a compatibilidade do componente escolhido com os demais itens já selecionados (soquete, memória, alimentação, dimensões e conectores). |
|  | 5. Atualiza o resumo da montagem com o custo acumulado, os alertas de compatibilidade e a estimativa de consumo de energia. |
| 6. Ajusta as escolhas até concluir a montagem e solicita o salvamento do setup. |  |
|  | 7. Executa o cálculo de desempenho da configuração conforme o Caso de Uso <Cálculo de setup>. |
|  | 8. Persiste o setup na conta do usuário e disponibiliza as opções de compartilhamento e de acompanhamento de preços. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se dois componentes forem incompatíveis, bloqueia a inclusão, indica o motivo e sugere alternativas equivalentes. |
|  | 2. Se a fonte selecionada não suportar o consumo estimado, emite alerta e recomenda a potência mínima adequada. |
|  | 3. Se o custo acumulado ultrapassar o orçamento informado, sinaliza o excedente e sugere substituições de menor custo. |
|  | 4. Se uma oferta vinculada ao setup for encerrada, marca o item como indisponível e mantém a especificação para substituição. |

### Aba: `STY014 - Calculo de Setup`

| Nome do Caso de Uso | Cálculo de setup |
| --- | --- |
| Finalidade/Objetivo: | Calcular e apresentar as métricas estimadas de desempenho, gargalo, consumo e custo-benefício de uma configuração montada. |
| Ator(es): | Usuário |
| Pré-Condições: | Existe um setup montado com os componentes mínimos obrigatórios definidos. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Solicita o cálculo do setup montado. |  |
|  | 2. Recupera os dados de benchmark de cada componente selecionado e o perfil de carga informado. |
|  | 3. Calcula a pontuação estimada de desempenho por perfil de uso e identifica o componente limitante da configuração. |
|  | 4. Calcula o consumo estimado em watts, o custo total e o índice de custo-benefício da montagem. |
|  | 5. Apresenta o resultado com o percentual de gargalo, as métricas por perfil e a comparação com setups de referência da mesma faixa de preço. |
| 6. Consulta as recomendações de melhoria e, opcionalmente, aplica uma substituição sugerida. |  |
|  | 7. Recalcula as métricas e atualiza o resultado apresentado. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se algum componente não possuir dados de benchmark, utiliza a média da sua categoria e sinaliza a estimativa como aproximada. |
|  | 2. Se faltarem componentes obrigatórios, informa quais categorias precisam ser preenchidas antes do cálculo. |
|  | 3. Se o gargalo identificado exceder o limite aceitável, destaca o componente limitante e apresenta as opções de correção. |

### Aba: `STY015 - Tendencias de Setup`

| Nome do Caso de Uso | Tendências de setup |
| --- | --- |
| Finalidade/Objetivo: | Apresentar as tendências de montagem e de preço da comunidade, incluindo configurações populares, componentes em alta e variação histórica de valores. |
| Ator(es): | Usuário |
| Pré-Condições: | Existe volume mínimo de montagens e de transações registradas para o período consultado. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa a área de tendências de setup. |  |
|  | 2. Apresenta os setups mais montados no período, segmentados por faixa de orçamento e por finalidade de uso. |
| 3. Aplica os filtros de período, faixa de preço e categoria de componente. |  |
|  | 4. Recalcula os indicadores e exibe a variação percentual de preço médio, o volume de negociações e os componentes com maior alta e baixa. |
| 5. Seleciona um componente da lista para detalhamento. |  |
|  | 6. Exibe a série histórica de preços do componente, a mediana atual do mercado interno e a recomendação de momento de compra. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se não houver volume mínimo de dados para os filtros aplicados, informa a insuficiência amostral e sugere ampliar o período. |
|  | 2. Se o componente selecionado não possuir histórico de negociações, exibe apenas as ofertas ativas. |

### Aba: `STY016 - Publicar Oferta`

| Nome do Caso de Uso | Publicar oferta |
| --- | --- |
| Finalidade/Objetivo: | Permitir que o vendedor cadastre e publique uma oferta de item, com descrição, estado de conservação, imagens, preço e condições de entrega, incluindo o envio e a ordenação da galeria de fotos. |
| Ator(es): | Usuário (Vendedor) |
| Pré-Condições: | O vendedor está autenticado, possui perfil verificado e não excedeu o limite de anúncios ativos do seu plano. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Aciona a opção de publicar oferta. |  |
|  | 2. Exibe o formulário com os campos: título, categoria, modelo, estado de conservação, tempo de uso, descrição, preço, aceite de propostas, forma de entrega e localização aproximada. |
| 3. Preenche os dados do item e seleciona a categoria correspondente. |  |
|  | 4. Sugere o preço de referência com base no histórico de negociações do modelo e apresenta os campos técnicos específicos da categoria. |
| 5. Envia as imagens do item, selecionando os arquivos ou capturando as fotos pela câmera. |  |
|  | 6. Valida o formato, o tamanho e a quantidade de imagens, gera as miniaturas, remove os metadados de localização e verifica conteúdo impróprio. |
| 7. Reordena as imagens, define a imagem de capa e remove as que não deseja manter. |  |
| 8. Opcionalmente, aciona o Caso de Uso <Scanner IA> para o preenchimento assistido do detalhamento técnico. |  |
|  | 9. Valida a obrigatoriedade dos campos, o preço informado e a presença de dados pessoais na descrição. |
|  | 10. Submete o conteúdo à triagem automática de moderação, vincula a galeria e publica a oferta. |
|  | 11. Exibe a confirmação com o link do anúncio e oferece a opção de impulsionamento. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se algum campo obrigatório não for preenchido, destaca os campos pendentes e mantém os dados já informados. |
|  | 2. Se a descrição contiver telefone, e-mail ou endereço, aplica a censura automática conforme o Caso de Uso <Censura de dados pessoais em descrições de produtos>. |
|  | 3. Se o formato do arquivo não for suportado, o tamanho exceder o limite ou a quantidade máxima de imagens for atingida, recusa o envio e informa os limites aceitos. |
|  | 4. Se a verificação identificar conteúdo impróprio ou imagem duplicada de outro anúncio, retém a imagem e encaminha o caso para moderação. |
|  | 5. Se o preço divergir de forma significativa da referência do modelo, solicita confirmação e alerta sobre o risco de anúncio fraudulento. |
|  | 6. Se a triagem automática identificar item proibido, retém a publicação e encaminha o anúncio para análise da moderação. |
|  | 7. Se o limite de anúncios ativos for atingido, informa o limite e oferece as opções de encerrar um anúncio ou contratar um plano superior. |

### Aba: `STY017 - Scanner IA`

| Nome do Caso de Uso | Scanner IA |
| --- | --- |
| Finalidade/Objetivo: | Identificar automaticamente o modelo, as especificações e o estado aparente de conservação de um componente a partir das imagens enviadas, preenchendo previamente os dados da oferta. |
| Ator(es): | Usuário (Vendedor) |
| Pré-Condições: | O vendedor está no fluxo de publicação ou edição de oferta e possui ao menos uma imagem do item. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Aciona o scanner e envia ou captura as imagens do componente, incluindo a etiqueta de identificação. |  |
|  | 2. Valida a qualidade, a nitidez e o enquadramento das imagens recebidas. |
|  | 3. Processa as imagens no modelo de reconhecimento e identifica a categoria, o fabricante e o modelo do componente. |
|  | 4. Recupera as especificações técnicas do modelo identificado no catálogo e estima o estado aparente de conservação. |
|  | 5. Apresenta o resultado com o grau de confiança da identificação e os campos preenchidos previamente. |
| 6. Confere as informações, ajusta o que for necessário e confirma o preenchimento. |  |
|  | 7. Aplica os dados confirmados à oferta e registra o retorno do usuário para aprimoramento do modelo. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se a imagem estiver desfocada, mal enquadrada ou com baixa iluminação, orienta a nova captura e indica o problema identificado. |
|  | 2. Se o grau de confiança for inferior ao mínimo, apresenta as três hipóteses mais prováveis para escolha manual do vendedor. |
|  | 3. Se o componente não constar no catálogo, registra o caso para curadoria e mantém o preenchimento manual. |
|  | 4. Se o serviço de inferência estiver indisponível, informa a indisponibilidade e permite o prosseguimento sem o scanner. |

### Aba: `STY018 - Impulsao de Oferta`

| Nome do Caso de Uso | Impulsão de oferta (pago / ONG) |
| --- | --- |
| Finalidade/Objetivo: | Permitir a contratação de destaque para uma oferta, mediante pagamento, uso de moedas ou cota gratuita concedida a ONGs verificadas. |
| Ator(es): | Usuário (Vendedor)/ ONG |
| Pré-Condições: | A oferta está ativa e pertence ao ator. O ator possui método de pagamento cadastrado, saldo de moedas ou cota de ONG disponível. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Seleciona a oferta e aciona a opção de impulsionar. |  |
|  | 2. Apresenta os planos disponíveis com duração, alcance estimado, valor e formas de pagamento aceitas. |
| 3. Escolhe o plano e a forma de pagamento (cartão, moedas ou cota de ONG). |  |
|  | 4. Valida a elegibilidade do ator e a disponibilidade da forma de pagamento escolhida. |
|  | 5. Processa a cobrança ou debita as moedas e ativa o destaque da oferta pelo período contratado. |
|  | 6. Exibe a confirmação com a data de término e disponibiliza o painel de desempenho do impulsionamento. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se o pagamento for recusado, mantém a oferta sem destaque e apresenta as opções de outro método de pagamento. |
|  | 2. Se o saldo de moedas for insuficiente, informa a diferença e oferece o pagamento complementar. |
|  | 3. Se o ator for ONG sem verificação concluída, bloqueia o uso da cota gratuita e apresenta a situação do cadastro. |
|  | 4. Se a oferta for pausada ou encerrada durante o período contratado, suspende o destaque e recalcula o saldo restante do plano. |

### Aba: `STY019 - Alterar Status Anuncio`

| Nome do Caso de Uso | Alterar status do anúncio (pausar / reabrir) |
| --- | --- |
| Finalidade/Objetivo: | Permitir que o vendedor suspenda temporariamente a exibição pública de uma oferta e a retome posteriormente, preservando os dados e o histórico do anúncio. |
| Ator(es): | Usuário (Vendedor) |
| Pré-Condições: | A oferta pertence ao ator e encontra-se ativa, pausada ou encerrada dentro do prazo de reabertura. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa a lista dos seus anúncios e seleciona a oferta desejada. |  |
|  | 2. Apresenta a situação atual da oferta e as ações disponíveis: pausar, quando ativa, ou reabrir, quando pausada ou encerrada. |
| 3. Aciona a alteração de situação pretendida. |  |
|  | 4. Na pausa, apresenta o resumo das negociações em andamento vinculadas à oferta e solicita a confirmação e o motivo. |
|  | 5. Na reabertura, recupera os dados da oferta e solicita a confirmação ou a atualização do preço e do estado de conservação do item. |
| 6. Confirma a operação e informa o motivo ou atualiza os dados solicitados. |  |
|  | 7. Na pausa, altera a situação para pausada, remove a oferta dos resultados de busca, suspende o impulsionamento vigente e notifica os usuários com negociação em andamento. |
|  | 8. Na reabertura, submete o anúncio à triagem automática de moderação, altera a situação para ativa, reinsere a oferta nos resultados de busca e notifica os usuários que a salvaram como favorita. |
|  | 9. Registra a alteração no histórico da oferta e exibe a confirmação. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se houver agendamento confirmado para o item, impede a pausa até o cancelamento ou a conclusão do encontro. |
|  | 2. Se a oferta estiver em leilão ativo, bloqueia a pausa e informa a restrição. |
|  | 3. Se a oferta permanecer pausada além do prazo máximo, encerra-a automaticamente e notifica o vendedor. |
|  | 4. Se o limite de anúncios ativos do plano tiver sido atingido, impede a reabertura e apresenta as alternativas disponíveis. |
|  | 5. Se a oferta tiver sido encerrada por decisão de moderação, bloqueia a reabertura e informa o motivo. |
|  | 6. Se o prazo máximo de reabertura tiver expirado, orienta a criação de um novo anúncio a partir da cópia dos dados anteriores. |

### Aba: `STY020 - Buscar e Filtrar`

| Nome do Caso de Uso | Buscar e filtrar ofertas |
| --- | --- |
| Finalidade/Objetivo: | Permitir a localização de ofertas por termo textual e o refinamento dos resultados por localização, categoria, faixa de preço, estado de conservação e demais atributos técnicos. |
| Ator(es): | Usuário |
| Pré-Condições: | Existem ofertas ativas indexadas na plataforma e o índice de busca textual está disponível. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa a área de busca e informa o termo desejado ou seleciona uma categoria. |  |
|  | 2. Apresenta as sugestões automáticas de modelos, categorias e buscas populares relacionadas ao termo digitado. |
| 3. Confirma o termo, seleciona uma sugestão ou navega pela árvore de categorias. |  |
|  | 4. Consulta o índice, aplica a correção de digitação e recupera as ofertas correspondentes. |
|  | 5. Exibe os filtros aplicáveis: localização e raio de busca, subcategorias, faixa de preço, estado de conservação e atributos técnicos. |
| 6. Define os filtros desejados e, no filtro de localização, concede a permissão de acesso à localização ou informa o CEP ou a cidade. |  |
|  | 7. Calcula a área de abrangência, aplica os filtros combinados e apresenta os resultados com a quantidade total encontrada. |
|  | 8. Ordena os resultados por relevância ou distância, destaca as ofertas impulsionadas conforme a sinalização de patrocínio e indica a posição aproximada dos itens no mapa. |
| 9. Ajusta o critério de ordenação, refina os filtros e seleciona uma oferta para visualização. |  |
|  | 10. Mantém os filtros aplicados durante a navegação e permite salvar a busca para o recebimento de alertas de novas ofertas correspondentes. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se o termo não retornar resultados, sugere termos alternativos e apresenta ofertas de categorias relacionadas. |
|  | 2. Se o termo contiver apenas caracteres inválidos ou for muito curto, solicita um termo mais específico. |
|  | 3. Se nenhuma oferta atender aos filtros, informa a ausência de resultados e sugere a flexibilização dos critérios mais restritivos. |
|  | 4. Se não houver ofertas no raio informado, sugere a ampliação da área e apresenta os resultados mais próximos disponíveis. |
|  | 5. Se a permissão de localização for negada, mantém o filtro manual por CEP ou cidade; se o CEP for inválido, solicita a correção do dado. |
|  | 6. Se o valor mínimo informado for superior ao máximo, inverte automaticamente os limites e sinaliza o ajuste. |
|  | 7. Se o índice de busca estiver indisponível, aplica a consulta direta na base e sinaliza a possível lentidão. |
|  | 8. Se o usuário não estiver autenticado, permite a busca mas condiciona o salvamento de alertas à autenticação. |

### Aba: `STY021 - Enviar Mensagem`

| Nome do Caso de Uso | Enviar mensagem |
| --- | --- |
| Finalidade/Objetivo: | Permitir a troca de mensagens de texto e o envio de anexos entre comprador e vendedor dentro do chat vinculado a uma oferta. |
| Ator(es): | Usuário |
| Pré-Condições: | O ator está autenticado e a oferta está ativa. O chat não está encerrado nem bloqueado. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Aciona a opção de conversar com o anunciante a partir da oferta. |  |
|  | 2. Abre ou recupera o chat vinculado à oferta e exibe o histórico de mensagens. |
| 3. Digita a mensagem e, opcionalmente, aciona a opção de anexo, selecionando o arquivo ou capturando a imagem. |  |
|  | 4. Valida o formato, o tamanho e a quantidade de anexos por mensagem e executa a verificação antivírus e a análise de conteúdo impróprio do arquivo. |
|  | 5. Gera a pré-visualização do anexo e apresenta-a ao remetente. |
| 6. Confirma o envio da mensagem, com ou sem anexo. |  |
|  | 7. Valida o conteúdo textual quanto a dados pessoais, links externos e linguagem ofensiva. |
|  | 8. Registra a mensagem e o anexo com acesso restrito aos participantes, entrega-os ao destinatário e atualiza o indicador de leitura. |
|  | 9. Notifica o destinatário pelos canais configurados e dispara a mensagem automática do vendedor, quando houver. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se a mensagem contiver dados de contato ou links externos, oculta o trecho identificado e alerta o remetente sobre a política de negociação na plataforma. |
|  | 2. Se o formato do anexo não for suportado ou o tamanho exceder o limite, recusa o arquivo e informa as restrições. |
|  | 3. Se a verificação identificar arquivo malicioso ou conteúdo impróprio, bloqueia o envio e registra o evento para a moderação. |
|  | 4. Se o destinatário tiver bloqueado o remetente, impede o envio e informa a indisponibilidade do contato. |
|  | 5. Se a oferta tiver sido encerrada, mantém o histórico em modo somente leitura. |
|  | 6. Se houver falha de conexão ou o envio do anexo for interrompido, mantém a mensagem em fila local e permite retomar o carregamento ao restabelecer o acesso. |

### Aba: `STY022 - Config Msg Automatica`

| Nome do Caso de Uso | Configurar mensagem automática de vendedor |
| --- | --- |
| Finalidade/Objetivo: | Permitir a manutenção das mensagens automáticas enviadas ao início de uma conversa ou fora do horário de atendimento. O ator utiliza o fluxo do Caso de Uso <Manter Geral>. |
| Ator(es): | Usuário (Vendedor) |
| Pré-Condições: | O ator está autenticado e possui perfil de vendedor. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa as configurações de chat e seleciona a opção de mensagem automática. |  |
|  | 2. Exibe as mensagens configuradas, o horário de atendimento e a situação de ativação de cada uma. |
| 3. Cadastra ou altera o texto da mensagem, define o gatilho (primeira mensagem ou fora do horário) e o período de vigência. |  |
|  | 4. Valida o tamanho do texto e a presença de dados pessoais ou links externos. |
|  | 5. Persiste a configuração, ativa a regra e apresenta a pré-visualização da mensagem. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se o texto contiver dados de contato externos, recusa a configuração e indica o trecho a ser corrigido. |
|  | 2. Se o texto exceder o limite de caracteres, informa o excedente e mantém o conteúdo digitado. |
| 3. Desativa a mensagem automática; o sistema mantém o texto salvo e interrompe o envio automático. |  |

### Aba: `STY023 - Delecao de Mensagem`

| Nome do Caso de Uso | Deleção de mensagem (usuário) |
| --- | --- |
| Finalidade/Objetivo: | Permitir que o autor exclua uma mensagem do chat, para si ou para todos os participantes, respeitando o prazo definido e a retenção para auditoria. |
| Ator(es): | Usuário |
| Pré-Condições: | A mensagem existe, pertence ao ator e o chat não está bloqueado por reclamação em análise. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Seleciona a mensagem no chat e aciona a opção de excluir. |  |
|  | 2. Apresenta as opções de exclusão apenas para o ator ou para todos os participantes, conforme o prazo decorrido. |
| 3. Escolhe a opção desejada e confirma. |  |
|  | 4. Remove a mensagem da visualização selecionada e exibe a marcação de mensagem excluída no lugar do conteúdo. |
|  | 5. Mantém o registro original em área de auditoria pelo prazo legal e registra o evento em log. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se o prazo para exclusão para todos tiver expirado, permite apenas a exclusão para o próprio ator. |
|  | 2. Se a mensagem estiver vinculada a uma denúncia ou reclamação em andamento, bloqueia a exclusão e informa o motivo. |
|  | 3. Se a mensagem já tiver sido excluída, atualiza a visualização do chat e informa a situação. |

### Aba: `STY024 - Encerramento de Chat`

| Nome do Caso de Uso | Encerramento de chat (usuário) |
| --- | --- |
| Finalidade/Objetivo: | Encerrar uma conversa do chat, impedindo o envio de novas mensagens e preservando o histórico para consulta. |
| Ator(es): | Usuário |
| Pré-Condições: | Existe um chat ativo do qual o ator participa. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Seleciona a conversa e aciona a opção de encerrar chat. |  |
|  | 2. Verifica a existência de agendamentos, propostas ou transações em andamento vinculados à conversa. |
|  | 3. Apresenta o resumo das pendências, quando houver, e solicita a confirmação com o motivo do encerramento. |
| 4. Informa o motivo e confirma o encerramento. |  |
|  | 5. Altera a situação do chat para encerrado, notifica o outro participante e mantém o histórico em modo somente leitura. |
|  | 6. Quando aplicável, oferece ao ator a avaliação da contraparte. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se houver agendamento confirmado, exige o cancelamento prévio conforme o Caso de Uso <Cancelar agendamento>. |
|  | 2. Se houver reclamação aberta, mantém o chat ativo até a decisão da moderação. |
| 3. Reabre a conversa dentro do prazo permitido; o sistema restaura a situação ativa e notifica o outro participante. |  |

### Aba: `STY025 - Agendar Horario`

| Nome do Caso de Uso | Agendar horário |
| --- | --- |
| Finalidade/Objetivo: | Registrar o agendamento de um encontro presencial entre comprador e vendedor, com data, horário e local definidos. |
| Ator(es): | Usuário (Comprador) |
| Pré-Condições: | Existe negociação em andamento entre as partes e a oferta está ativa. O vendedor possui disponibilidade cadastrada. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Aciona a opção de agendar encontro a partir do chat da negociação. |  |
|  | 2. Apresenta a agenda de disponibilidade do vendedor e a lista de pontos de encontro seguros sugeridos na região. |
| 3. Seleciona a data, o horário e o local desejados e confirma a solicitação. |  |
|  | 4. Registra o agendamento com situação 'pendente de confirmação' e notifica o vendedor. |
| 5. O vendedor confirma o agendamento proposto. |  |
|  | 6. Altera a situação para confirmado, gera o QR Code do encontro conforme o Caso de Uso <Geração de QR Code> e disponibiliza a rota. |
|  | 7. Envia a confirmação às partes com os dados do encontro e programa os lembretes automáticos. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se o horário selecionado deixar de estar disponível, informa o conflito e apresenta as opções mais próximas. |
|  | 2. Se o vendedor recusar a proposta, notifica o comprador e solicita novo horário. |
|  | 3. Se o vendedor não responder dentro do prazo, expira a solicitação e libera a agenda. |
|  | 4. Se o local escolhido não for um ponto seguro cadastrado, exibe o alerta de segurança e exige confirmação adicional das duas partes. |

### Aba: `STY026 - Cancelar Agendamento`

| Nome do Caso de Uso | Cancelar agendamento |
| --- | --- |
| Finalidade/Objetivo: | Cancelar um encontro previamente agendado, notificando a contraparte e aplicando os efeitos previstos na política de reputação. |
| Ator(es): | Usuário (Comprador/ Vendedor) |
| Pré-Condições: | Existe agendamento confirmado do qual o ator participa e o encontro ainda não foi realizado. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa o agendamento e aciona a opção de cancelar. |  |
|  | 2. Apresenta a política de cancelamento, o prazo de antecedência restante e o impacto na reputação. |
| 3. Seleciona o motivo do cancelamento e confirma. |  |
|  | 4. Altera a situação do agendamento para cancelado, invalida o QR Code gerado e libera a agenda do vendedor. |
|  | 5. Notifica a contraparte com o motivo informado e registra a ocorrência no histórico dos participantes. |
|  | 6. Oferece a opção de reagendamento e mantém a negociação ativa no chat. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se o cancelamento ocorrer fora do prazo mínimo de antecedência, registra a ocorrência como cancelamento tardio e aplica o impacto previsto na reputação do ator. |
|  | 2. Se o encontro já tiver sido iniciado por leitura do QR Code, impede o cancelamento e orienta a abertura de reclamação. |
|  | 3. Se o ator acumular cancelamentos tardios acima do limite, restringe temporariamente a criação de novos agendamentos. |

### Aba: `STY027 - Geracao de QR Code`

| Nome do Caso de Uso | Geração de QR Code |
| --- | --- |
| Finalidade/Objetivo: | Gerar um código de uso único, vinculado ao agendamento e à transação, que comprova a realização do encontro entre as partes. |
| Ator(es): | Usuário (Comprador/ Vendedor) |
| Pré-Condições: | Existe agendamento confirmado entre comprador e vendedor. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa o agendamento confirmado e solicita a exibição do código do encontro. |  |
|  | 2. Valida a vigência do agendamento e a identidade do solicitante. |
|  | 3. Gera o código de uso único, assinado e com prazo de validade vinculado à janela do encontro. |
|  | 4. Apresenta o QR Code na tela, disponibiliza o código alfanumérico alternativo e permite o armazenamento para uso offline. |
| 5. Apresenta o código à contraparte no momento do encontro. |  |
|  | 6. Mantém o código válido até a leitura ou até o término do prazo de validade. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se o agendamento for cancelado, invalida imediatamente o código gerado. |
|  | 2. Se o prazo de validade expirar sem leitura, invalida o código e permite a geração de novo código dentro da janela tolerada. |
|  | 3. Se houver suspeita de compartilhamento indevido do código, revoga o código e exige nova geração pelo titular autenticado. |

### Aba: `STY028 - Escanear QR Code`

| Nome do Caso de Uso | Escanear QR Code |
| --- | --- |
| Finalidade/Objetivo: | Validar o código do encontro apresentado pela contraparte, confirmando a realização da entrega e avançando a transação para a etapa de pós-compra. |
| Ator(es): | Usuário (Comprador/ Vendedor) |
| Pré-Condições: | Existe agendamento confirmado com código válido e ambas as partes estão presentes no encontro. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Aciona a leitura de código no aplicativo e aponta a câmera para o QR Code da contraparte. |  |
|  | 2. Captura o código, valida a assinatura, a vigência e o vínculo com o agendamento e a transação. |
|  | 3. Exibe os dados do encontro, o item negociado e o valor acordado para conferência. |
| 4. Confere as informações e confirma a realização da entrega. |  |
|  | 5. Registra a data, a hora e a confirmação das duas partes, invalida o código e altera a situação da transação para concluída. |
|  | 6. Credita as moedas de cashback, disponibiliza o comprovante e habilita a avaliação recíproca. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se o código estiver expirado, cancelado ou já utilizado, recusa a leitura e informa a situação identificada. |
|  | 2. Se o código pertencer a outro agendamento, bloqueia a operação e registra a tentativa em log. |
| 3. Informa manualmente o código alfanumérico quando a câmera estiver indisponível; o sistema aplica a mesma validação. |  |
|  | 4. Se o dispositivo estiver sem conexão, armazena a leitura localmente e sincroniza a confirmação quando o acesso for restabelecido. |

### Aba: `STY029 - Gerar e Consultar Rota`

| Nome do Caso de Uso | Gerar e consultar rota |
| --- | --- |
| Finalidade/Objetivo: | Calcular e apresentar o trajeto entre a posição do usuário e o local do encontro agendado, com estimativa de tempo, alternativas de deslocamento e disponibilidade de consulta em modo offline. |
| Ator(es): | Usuário |
| Pré-Condições: | Existe agendamento confirmado com local definido. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa o agendamento e aciona a opção de gerar rota. |  |
|  | 2. Solicita a permissão de acesso à localização do dispositivo. |
| 3. Concede a permissão ou informa o ponto de partida manualmente. |  |
|  | 4. Consulta o serviço de mapas e calcula as rotas disponíveis por modal de transporte. |
|  | 5. Apresenta o trajeto recomendado, a distância, o tempo estimado de chegada e os pontos de referência do caminho. |
| 6. Seleciona a rota desejada e inicia o deslocamento. |  |
|  | 7. Armazena localmente a rota, o endereço, o código do encontro e os dados de contato da contraparte, e envia o lembrete de saída conforme o tempo estimado. |
| 8. Consulta a rota durante o deslocamento, ainda que sem conexão de dados. |  |
|  | 9. Identifica a ausência de conexão, carrega os dados armazenados no dispositivo e exibe o aviso de modo offline com a data da última sincronização. |
|  | 10. Acompanha a posição do dispositivo pelo GPS sobre o mapa armazenado, sem consumo de dados, e sincroniza as informações pendentes ao restabelecer a conexão. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se a permissão de localização for negada, mantém o cálculo a partir do endereço informado manualmente. |
|  | 2. Se o serviço de mapas estiver indisponível, apresenta o endereço do ponto de encontro e a rota armazenada anteriormente, quando houver. |
|  | 3. Se o tempo estimado inviabilizar a chegada no horário, alerta o usuário e sugere o reagendamento. |
|  | 4. Se não houver dados armazenados para o agendamento, informa a indisponibilidade e orienta a sincronização prévia. |
|  | 5. Se o agendamento tiver sido alterado ou cancelado enquanto o dispositivo estava offline, apresenta o alerta de divergência imediatamente após a sincronização. |
|  | 6. Se o armazenamento local estiver expirado, exige nova sincronização antes de exibir a rota. |

### Aba: `STY030 - Laudo Tecnico`

| Nome do Caso de Uso | Laudo técnico |
| --- | --- |
| Finalidade/Objetivo: | Solicitar, registrar e disponibilizar o laudo técnico de um item negociado, atestando seu funcionamento, suas especificações e seu estado real de conservação. |
| Ator(es): | Usuário (Comprador)/ Técnico Parceiro |
| Pré-Condições: | Existe negociação em andamento e o item pertence a uma categoria elegível para laudo. Há técnico parceiro disponível na região. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Solicita o laudo técnico a partir da negociação e escolhe o técnico parceiro e a modalidade de atendimento. |  |
|  | 2. Apresenta o escopo dos testes da categoria, o prazo e o valor do serviço, e solicita a anuência do vendedor. |
| 3. Confirma a solicitação e efetua o pagamento do serviço. |  |
|  | 4. Registra a ordem de serviço, notifica o técnico e o vendedor e agenda a avaliação. |
| 5. O técnico parceiro executa os testes previstos e registra os resultados, as evidências e as medições no formulário do laudo. |  |
|  | 6. Valida a completude do formulário, gera o laudo assinado digitalmente e o vincula ao item e à transação. |
|  | 7. Disponibiliza o laudo às partes, atualiza o selo de verificação técnica no anúncio e notifica os interessados. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se o vendedor não autorizar a avaliação, cancela a solicitação e estorna o valor pago. |
|  | 2. Se o item apresentar divergência em relação ao anunciado, registra a inconformidade no laudo, notifica as partes e habilita a renegociação ou o cancelamento sem ônus para o comprador. |
|  | 3. Se o técnico não comparecer ou não concluir os testes no prazo, cancela a ordem de serviço, estorna o valor e registra a ocorrência na avaliação do parceiro. |
|  | 4. Se o item não for elegível para os testes da categoria, informa a restrição antes da contratação. |

### Aba: `STY031 - Solicitar Devolucao`

| Nome do Caso de Uso | Solicitar devolução |
| --- | --- |
| Finalidade/Objetivo: | Registrar e encaminhar a solicitação de devolução de um item adquirido, dentro do prazo e das condições previstas na política da plataforma. |
| Ator(es): | Usuário (Comprador) |
| Pré-Condições: | Existe transação concluída em nome do ator e o prazo de devolução não expirou. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa o histórico de compras, seleciona a transação e aciona a opção de solicitar devolução. |  |
|  | 2. Apresenta a política de devolução aplicável, o prazo restante e os motivos possíveis. |
| 3. Seleciona o motivo, descreve o problema e anexa as evidências (fotos, vídeos e laudo técnico, quando houver). |  |
|  | 4. Valida a completude da solicitação e o enquadramento do motivo na política vigente. |
|  | 5. Registra a solicitação, bloqueia o repasse do valor ao vendedor e notifica a contraparte com o prazo de resposta. |
| 6. O vendedor aceita a devolução e as partes combinam a logística de retorno do item. |  |
|  | 7. Acompanha a devolução do item, confirma o recebimento pelo vendedor e processa o estorno ao comprador. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se o prazo de devolução tiver expirado, recusa a solicitação e orienta a abertura de reclamação. |
|  | 2. Se o vendedor recusar a devolução, converte a solicitação em reclamação conforme o Caso de Uso <Abrir reclamação>. |
|  | 3. Se o vendedor não responder no prazo, defere a devolução automaticamente em favor do comprador. |
|  | 4. Se o item devolvido apresentar estado divergente do recebido, suspende o estorno e encaminha o caso para a mediação. |

### Aba: `STY032 - Geracao de PDF`

| Nome do Caso de Uso | Geração de PDF (comprovante) |
| --- | --- |
| Finalidade/Objetivo: | Gerar o documento em formato PDF que comprova uma transação concluída na plataforma, contendo as partes, o item, o valor e a data do encontro. |
| Ator(es): | Usuário |
| Pré-Condições: | Existe transação concluída da qual o ator participa. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa o histórico de negociações e aciona a opção de emitir comprovante. |  |
|  | 2. Recupera os dados da transação, das partes envolvidas, do item e da confirmação de entrega. |
|  | 3. Compõe o documento com o número da transação, os dados mascarados das partes, o valor, a data e o código de autenticidade. |
|  | 4. Gera o arquivo em PDF e o disponibiliza para download e envio por e-mail. |
| 5. Realiza o download ou solicita o envio por e-mail. |  |
|  | 6. Registra a emissão em log e mantém o documento acessível no histórico da transação. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se a transação não estiver concluída, informa que o comprovante só é emitido após a confirmação da entrega. |
|  | 2. Se houver reclamação ou devolução em andamento, emite o comprovante com a indicação da pendência. |
|  | 3. Se a geração falhar, registra o erro, informa o usuário e disponibiliza nova tentativa. |

### Aba: `STY033 - Abrir Reclamacao`

| Nome do Caso de Uso | Abrir reclamação |
| --- | --- |
| Finalidade/Objetivo: | Registrar uma reclamação vinculada a uma negociação, iniciando o processo de mediação entre as partes. |
| Ator(es): | Usuário |
| Pré-Condições: | Existe negociação ou transação da qual o ator participa e não há reclamação aberta para o mesmo fato. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Seleciona a negociação e aciona a opção de abrir reclamação. |  |
|  | 2. Apresenta os tipos de reclamação, os prazos do processo e as informações necessárias. |
| 3. Seleciona o tipo, descreve o ocorrido, anexa as evidências e indica a solução pretendida. |  |
|  | 4. Valida a completude do registro e vincula automaticamente o histórico do chat, o anúncio e os comprovantes da transação. |
|  | 5. Registra a reclamação com número de protocolo, bloqueia o repasse de valores pendentes e notifica a contraparte. |
| 6. A contraparte apresenta sua defesa dentro do prazo estabelecido. |  |
|  | 7. Encaminha o caso à fila de mediação e informa às partes o prazo previsto para a análise. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se já existir reclamação aberta para o mesmo fato, apresenta o protocolo existente e permite a complementação das evidências. |
|  | 2. Se a contraparte não se manifestar no prazo, prossegue a mediação à revelia e registra a ausência de resposta. |
| 3. As partes chegam a um acordo antes da mediação; o sistema registra o acordo e encerra a reclamação de forma consensual. |  |
|  | 4. Se o fato indicar violação grave dos termos de uso, aciona imediatamente a moderação e restringe as ações do usuário envolvido. |

### Aba: `STY034 - Escalamento Reclamacao`

| Nome do Caso de Uso | Requisitar escalamento de reclamação |
| --- | --- |
| Finalidade/Objetivo: | Encaminhar uma reclamação já analisada para revisão por nível superior de atendimento, mediante justificativa e novas evidências. |
| Ator(es): | Usuário |
| Pré-Condições: | Existe reclamação analisada em primeiro nível da qual o ator participa e o prazo para escalamento não expirou. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa a reclamação e aciona a opção de solicitar revisão. |  |
|  | 2. Apresenta a decisão anterior, os fundamentos aplicados e os requisitos para o escalamento. |
| 3. Registra a justificativa da discordância e anexa novas evidências, quando houver. |  |
|  | 4. Valida a tempestividade e a fundamentação do pedido. |
|  | 5. Altera o nível de atendimento da reclamação, atribui o caso à equipe especializada e mantém o bloqueio dos valores envolvidos. |
|  | 6. Notifica as partes sobre o escalamento e o novo prazo de análise. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se o prazo para escalamento tiver expirado, recusa a solicitação e informa a definitividade da decisão anterior. |
|  | 2. Se o pedido não apresentar fato ou evidência nova, mantém a decisão anterior e registra a análise sumária. |
|  | 3. Se a reclamação já estiver no nível máximo de atendimento, informa a impossibilidade de novo escalamento e apresenta as vias externas de solução. |

### Aba: `STY035 - Encerrar Reclamacao`

| Nome do Caso de Uso | Encerrar reclamação |
| --- | --- |
| Finalidade/Objetivo: | Registrar a decisão final de uma reclamação, aplicar os efeitos financeiros e reputacionais e encerrar o processo de mediação. |
| Ator(es): | Moderador User |
| Pré-Condições: | Existe reclamação em análise atribuída ao ator, com manifestações e evidências das partes disponíveis. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa a fila de mediação e seleciona a reclamação em análise. |  |
|  | 2. Apresenta o histórico completo do caso: negociação, chat, evidências, laudo técnico e manifestações das partes. |
| 3. Analisa o caso, seleciona o fundamento da decisão e define o desfecho (procedente, parcialmente procedente ou improcedente). |  |
| 4. Registra as medidas aplicáveis: estorno, liberação de valores, sanção ao usuário e ajuste de reputação. |  |
|  | 5. Valida a coerência entre o desfecho e as medidas selecionadas e solicita a confirmação. |
|  | 6. Executa as medidas financeiras e reputacionais, encerra a reclamação e registra a decisão em log de auditoria. |
|  | 7. Notifica as partes com a decisão fundamentada e o prazo para solicitar revisão. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se faltar evidência essencial, permite a suspensão do prazo e a solicitação de complementação às partes. |
|  | 2. Se a decisão implicar sanção de suspensão de conta, exige a aprovação de um segundo moderador antes da execução. |
|  | 3. Se houver falha na execução do estorno, mantém a reclamação em situação pendente financeira e registra o incidente para tratamento. |
| 4. Uma das partes solicita revisão dentro do prazo; o sistema reabre o caso conforme o Caso de Uso <Requisitar escalamento de reclamação>. |  |

### Aba: `STY036 - Criacao de Leilao`

| Nome do Caso de Uso | Criação de leilão (admin) |
| --- | --- |
| Finalidade/Objetivo: | Cadastrar e publicar um leilão, definindo os lotes, o período, o lance mínimo, o incremento e as regras de participação. |
| Ator(es): | Back-office User |
| Pré-Condições: | O ator possui perfil administrativo e os itens ou lotes a serem leiloados estão cadastrados e verificados. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa o módulo de leilões e aciona a criação de um novo leilão. |  |
|  | 2. Exibe o formulário com os campos: título, descrição, período de abertura e encerramento, tipo de leilão, lance mínimo, incremento mínimo e regras de habilitação. |
| 3. Preenche os dados do leilão e vincula os lotes e os itens que o compõem. |  |
|  | 4. Valida a consistência das datas, dos valores e da disponibilidade dos itens vinculados. |
| 5. Define as regras de participação, a taxa aplicável e a política de prorrogação automática no encerramento. |  |
|  | 6. Apresenta a pré-visualização do leilão para conferência. |
| 7. Confirma a publicação. |  |
|  | 8. Publica o leilão, agenda sua abertura automática, notifica os usuários interessados na categoria e registra a criação em log. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se algum item vinculado já estiver em outra negociação ou leilão ativo, bloqueia a vinculação e indica o conflito. |
|  | 2. Se a data de encerramento for anterior à de abertura ou o incremento for inválido, recusa a publicação e destaca a inconsistência. |
| 3. Salva o leilão como rascunho; o sistema mantém o cadastro sem publicá-lo e sem reservar os itens. |  |
|  | 4. Se houver necessidade de cancelamento após a publicação e já existirem lances, exige justificativa, notifica os participantes e registra o cancelamento em auditoria. |

### Aba: `STY037 - Participar em Leilao`

| Nome do Caso de Uso | Participar em leilão |
| --- | --- |
| Finalidade/Objetivo: | Permitir que o usuário se habilite e registre lances em um leilão ativo, acompanhando a disputa até seu encerramento. |
| Ator(es): | Usuário (Comprador) |
| Pré-Condições: | O leilão está aberto, o usuário está autenticado, verificado e possui método de pagamento válido cadastrado. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa o leilão e solicita a habilitação para participar. |  |
|  | 2. Valida o cadastro, a reputação e o método de pagamento do usuário e apresenta as regras e a taxa do leilão. |
| 3. Aceita as regras e confirma a habilitação. |  |
|  | 4. Habilita o participante, exibe o lance atual, o incremento mínimo e o tempo restante em tempo real. |
| 5. Registra o lance, respeitando o incremento mínimo, ou define um lance automático até o valor máximo desejado. |  |
|  | 6. Valida o valor, registra o lance, atualiza o valor corrente e notifica os demais participantes. |
|  | 7. Ao encerrar o leilão, apura o vencedor, notifica as partes e gera a transação com as instruções de pagamento e retirada. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se o lance for inferior ao valor corrente somado ao incremento mínimo, recusa o lance e informa o valor mínimo aceito. |
|  | 2. Se outro participante superar o lance, notifica o usuário e atualiza a disputa em tempo real. |
|  | 3. Se houver lance nos instantes finais, prorroga automaticamente o encerramento conforme a regra configurada. |
|  | 4. Se o vencedor não efetuar o pagamento no prazo, cancela a arrematação, aplica a penalidade prevista e oferece o lote ao segundo colocado. |
|  | 5. Se o usuário não atender aos requisitos de habilitação, informa o motivo e mantém o acesso apenas para acompanhamento. |

### Aba: `STY038 - Proposta de Lote`

| Nome do Caso de Uso | Proposta (lote) |
| --- | --- |
| Finalidade/Objetivo: | Registrar uma proposta de valor para um lote de itens de um mesmo vendedor, permitindo aceite, recusa ou contraproposta. |
| Ator(es): | Usuário (Comprador) |
| Pré-Condições: | Existem ofertas ativas do mesmo vendedor que aceitam propostas e o comprador está autenticado. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Seleciona os itens do vendedor que deseja adquirir em conjunto e aciona a opção de propor lote. |  |
|  | 2. Apresenta o resumo do lote com o valor somado das ofertas e o campo para o valor proposto. |
| 3. Informa o valor da proposta, o prazo de validade e uma justificativa opcional. |  |
|  | 4. Valida se o valor proposto respeita o limite mínimo aceito pelo vendedor e a disponibilidade de todos os itens. |
|  | 5. Registra a proposta, reserva os itens pelo prazo de validade e notifica o vendedor. |
| 6. O vendedor aceita a proposta. |  |
|  | 7. Converte a proposta em negociação, encerra os anúncios envolvidos e encaminha as partes ao agendamento do encontro. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se o valor proposto for inferior ao limite mínimo do vendedor, recusa automaticamente e informa a faixa aceita. |
|  | 2. Se o vendedor apresentar contraproposta, notifica o comprador, que pode aceitar, recusar ou propor novo valor até o limite de rodadas configurado. |
|  | 3. Se algum item do lote for vendido separadamente antes do aceite, cancela a proposta e notifica as partes. |
|  | 4. Se o prazo de validade expirar sem resposta, cancela a proposta e libera a reserva dos itens. |

### Aba: `STY039 - Req Cadastro de ONG`

| Nome do Caso de Uso | Requisitar cadastro (ONG) |
| --- | --- |
| Finalidade/Objetivo: | Registrar a solicitação de cadastro de uma organização sem fins lucrativos, com envio da documentação necessária para posterior verificação. |
| Ator(es): | Representante de ONG |
| Pré-Condições: | A organização não possui cadastro ativo na plataforma e o representante possui conta de usuário verificada. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa a área institucional e aciona a solicitação de cadastro de ONG. |  |
|  | 2. Exibe o formulário com os campos: razão social, CNPJ, endereço, área de atuação, responsável legal e dados de contato institucional. |
| 3. Preenche os dados da organização e anexa a documentação exigida (estatuto, ata de eleição da diretoria, comprovante de inscrição e documento do responsável). |  |
|  | 4. Valida o formato do CNPJ, a completude dos documentos e a inexistência de cadastro duplicado. |
| 5. Declara a veracidade das informações e aceita os termos específicos do perfil institucional. |  |
|  | 6. Registra a solicitação com situação 'em análise', gera o protocolo e notifica a fila de verificação administrativa. |
|  | 7. Informa ao representante o protocolo e o prazo estimado de análise. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se o CNPJ informado já possuir cadastro, informa a duplicidade e orienta a solicitação de vínculo ao cadastro existente. |
|  | 2. Se algum documento obrigatório estiver ausente ou ilegível, mantém a solicitação como rascunho e indica as pendências. |
|  | 3. Se a análise resultar em exigência, notifica o representante com o prazo para complementação da documentação. |

### Aba: `STY040 - Verificacao de ONG`

| Nome do Caso de Uso | Verificação de ONG (admin) |
| --- | --- |
| Finalidade/Objetivo: | Analisar e decidir sobre a solicitação de cadastro de uma organização, concedendo ou recusando o selo de ONG verificada. |
| Ator(es): | Back-office User |
| Pré-Condições: | Existe solicitação de cadastro de ONG em análise atribuída ao ator. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa a fila de verificação institucional e seleciona a solicitação. |  |
|  | 2. Apresenta os dados informados, os documentos anexados e o checklist de conformidade a ser preenchido. |
| 3. Confere cada item do checklist e consulta as bases públicas de validação do CNPJ e da situação cadastral. |  |
| 4. Registra o parecer e seleciona a decisão de aprovação. |  |
|  | 5. Solicita a confirmação e valida a completude do parecer. |
|  | 6. Concede o selo de ONG verificada, habilita a cota de impulsionamento gratuito e as funcionalidades institucionais. |
|  | 7. Notifica o representante, publica o perfil institucional no mural e registra a decisão em log de auditoria. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
| 1. Registra exigência documental; o sistema mantém a solicitação em análise, notifica o representante e suspende a contagem do prazo. |  |
| 2. Recusa a solicitação com justificativa; o sistema notifica o representante, informa o prazo para recurso e mantém o histórico da análise. |  |
|  | 3. Se a consulta às bases públicas indicar situação cadastral irregular, sinaliza o alerta ao analista e exige justificativa expressa para eventual aprovação. |

### Aba: `STY041 - Pedido de Doacoes`

| Nome do Caso de Uso | Publicação de pedido de doações (ONG) |
| --- | --- |
| Finalidade/Objetivo: | Permitir que uma organização verificada publique no mural institucional um pedido de doação de equipamentos, com a descrição da necessidade e da destinação. |
| Ator(es): | ONG Verificada |
| Pré-Condições: | A organização possui selo de ONG verificada ativo e não excedeu o limite de pedidos simultâneos. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa o mural institucional e aciona a publicação de um novo pedido de doação. |  |
|  | 2. Exibe o formulário com os campos: título, categorias de equipamento desejadas, quantidade, especificação mínima aceita, finalidade do projeto, prazo e forma de recebimento. |
| 3. Preenche os dados do pedido e anexa as imagens ou os documentos do projeto beneficiado. |  |
|  | 4. Valida a completude dos campos, o enquadramento das categorias e a vigência do selo institucional. |
|  | 5. Submete o pedido à triagem de moderação e o publica no mural com o selo de organização verificada. |
|  | 6. Notifica os usuários com itens compatíveis e disponibiliza o painel de acompanhamento das doações recebidas. |
| 7. Acompanha as ofertas de doação recebidas e confirma o aceite de cada uma. |  |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se o selo institucional estiver vencido ou suspenso, bloqueia a publicação e informa a situação do cadastro. |
|  | 2. Se o pedido contiver solicitação de valores em dinheiro, recusa a publicação e informa a restrição da política. |
|  | 3. Se o prazo do pedido expirar sem doações suficientes, encerra a publicação e oferece a renovação. |
|  | 4. Se a triagem de moderação identificar inconsistência, retém o pedido e solicita esclarecimentos à organização. |

### Aba: `STY042 - Verificar Moedas`

| Nome do Caso de Uso | Verificar moedas (cashback) |
| --- | --- |
| Finalidade/Objetivo: | Apresentar o saldo atual de moedas virtuais do usuário, seu extrato de movimentações e os prazos de expiração. |
| Ator(es): | Usuário Autenticado |
| Pré-Condições: | O usuário está autenticado e possui carteira de moedas ativa. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa a carteira de moedas na área da conta. |  |
|  | 2. Recupera o saldo disponível, o saldo bloqueado e as moedas com expiração próxima. |
|  | 3. Exibe o resumo do saldo, a equivalência estimada em valor e o alerta de moedas a expirar. |
| 4. Consulta o extrato e aplica os filtros de período e de tipo de movimentação. |  |
|  | 5. Apresenta o extrato detalhado com origem, valor, data e situação de cada crédito e débito. |
| 6. Seleciona uma movimentação para ver o detalhamento da sua origem. |  |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se não houver movimentações no período filtrado, informa a ausência de registros e apresenta as formas de obter moedas. |
|  | 2. Se houver crédito pendente de confirmação de transação, exibe-o como saldo bloqueado com a data prevista de liberação. |
|  | 3. Se a carteira estiver bloqueada por análise de fraude, exibe apenas o saldo e informa a restrição temporária de uso. |

### Aba: `STY043 - Resgatar Moedas`

| Nome do Caso de Uso | Resgatar moedas |
| --- | --- |
| Finalidade/Objetivo: | Converter o saldo de moedas do usuário em benefício, mediante escolha do destino permitido e validação das regras de resgate. |
| Ator(es): | Usuário Autenticado |
| Pré-Condições: | O usuário está autenticado, possui saldo disponível igual ou superior ao mínimo de resgate e sua conta está verificada. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa a carteira e aciona a opção de resgatar moedas. |  |
|  | 2. Apresenta os destinos disponíveis (crédito em conta na plataforma, cupom de desconto ou doação a ONG verificada) e as respectivas regras. |
| 3. Escolhe o destino e informa a quantidade de moedas a resgatar. |  |
|  | 4. Valida o saldo, o valor mínimo e os limites do período, e apresenta o resumo da conversão. |
| 5. Confirma o resgate e informa o segundo fator de autenticação, quando exigido. |  |
|  | 6. Debita as moedas, gera o benefício no destino escolhido e registra a operação no extrato. |
|  | 7. Notifica o usuário com o comprovante do resgate. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se o saldo for inferior ao mínimo de resgate, informa o valor faltante e mantém a operação indisponível. |
|  | 2. Se o limite de resgates do período tiver sido atingido, informa a data de liberação do próximo resgate. |
|  | 3. Se a conta não estiver verificada, exige a conclusão da verificação de identidade antes do resgate. |
|  | 4. Se a geração do benefício falhar, estorna as moedas debitadas e registra o incidente. |

### Aba: `STY044 - Gastar Moedas`

| Nome do Caso de Uso | Gastar moedas |
| --- | --- |
| Finalidade/Objetivo: | Permitir a utilização do saldo de moedas como forma de pagamento total ou parcial de serviços elegíveis da plataforma. |
| Ator(es): | Usuário Autenticado |
| Pré-Condições: | O usuário está autenticado, possui saldo disponível e o serviço selecionado aceita pagamento com moedas. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Seleciona um serviço elegível (impulsionamento, laudo técnico ou taxa de leilão) e escolhe o pagamento com moedas. |  |
|  | 2. Apresenta o valor do serviço, a quantidade de moedas necessária e o saldo disponível do usuário. |
| 3. Define o valor a ser pago em moedas e, se necessário, o complemento em outro método de pagamento. |  |
|  | 4. Valida o saldo, a elegibilidade do serviço e os limites de uso por operação. |
| 5. Confirma a operação. |  |
|  | 6. Debita as moedas, processa o eventual complemento, ativa o serviço contratado e registra a movimentação no extrato. |
|  | 7. Exibe a confirmação com o comprovante da operação. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se o saldo for insuficiente para o valor integral, apresenta o pagamento híbrido com o complemento a ser cobrado no método cadastrado. |
|  | 2. Se o serviço não for elegível ao pagamento com moedas, informa a restrição e apresenta os métodos aceitos. |
|  | 3. Se a contratação do serviço falhar após o débito, estorna as moedas automaticamente e notifica o usuário. |

### Aba: `STY045 - Manter Metodo Pgto`

| Nome do Caso de Uso | Manter método de pagamento |
| --- | --- |
| Finalidade/Objetivo: | Registrar, alterar e excluir os métodos de pagamento da conta do usuário, com tokenização dos dados junto ao provedor, validação de titularidade e revogação segura. O ator utiliza o fluxo do Caso de Uso <Manter Geral>. |
| Ator(es): | Usuário Autenticado |
| Pré-Condições: | O usuário está autenticado e o serviço de pagamento está disponível. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa a carteira e visualiza os métodos de pagamento cadastrados, com os dados mascarados. |  |
|  | 2. Apresenta os métodos aceitos e as ações disponíveis: incluir, alterar, definir como principal e excluir. |
| 3. Aciona a inclusão e informa os dados do método escolhido e o endereço de cobrança no formulário seguro do provedor. |  |
|  | 4. Envia os dados diretamente ao provedor, recebe o token de referência, descarta os dados sensíveis e executa a validação de titularidade prevista. |
|  | 5. Registra o método com os dados mascarados, define-o como principal quando for o primeiro e exibe a confirmação. |
| 6. Aciona a alteração de um método e edita os campos disponíveis: validade, apelido, endereço de cobrança e indicador de método principal. |  |
|  | 7. Envia as alterações ao provedor, revalida o método, atualiza o token de referência e persiste os dados. |
| 8. Aciona a exclusão de um método que não deseja manter. |  |
|  | 9. Verifica a existência de cobranças pendentes, serviços recorrentes e habilitações em leilão vinculadas ao método e apresenta os impactos identificados. |
| 10. Confirma a exclusão. |  |
|  | 11. Revoga o token junto ao provedor, remove o método da carteira, registra o evento em log e solicita a definição de um novo método principal, quando aplicável. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se os dados forem recusados pelo provedor, informa a recusa sem detalhar o motivo e permite nova tentativa. |
|  | 2. Se o método já estiver cadastrado na conta, informa a duplicidade e mantém o registro existente. |
|  | 3. Se o cartão estiver vencido ou a validação de titularidade falhar, não conclui a operação e orienta a conferência dos dados. |
|  | 4. Se o limite de métodos cadastrados for atingido, exige a exclusão prévia de um método existente. |
|  | 5. Se houver cobrança recorrente vinculada, alerta sobre o impacto da alteração e solicita confirmação adicional. |
|  | 6. Se houver cobrança pendente ou habilitação ativa em leilão vinculada ao método, impede a exclusão e informa a pendência. |
|  | 7. Se o método for o único cadastrado e houver serviço recorrente ativo, exige o cadastro prévio de um substituto. |
|  | 8. Se a revogação junto ao provedor falhar, mantém o método inativo na carteira e agenda nova tentativa de revogação. |

### Aba: `STY046 - Hardware Captcha`

| Nome do Caso de Uso | Hardware Captcha |
| --- | --- |
| Finalidade/Objetivo: | Apresentar desafios de verificação humana baseados em reconhecimento de componentes de hardware, aproveitando as respostas para enriquecer a base de rotulagem da plataforma. |
| Ator(es): | Usuário |
| Pré-Condições: | Existe banco de imagens de componentes disponível e a operação em curso exige verificação humana. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Aciona uma operação que exige verificação humana. |  |
|  | 2. Seleciona um conjunto de imagens de componentes composto por itens já rotulados (controle) e itens pendentes de rotulagem. |
|  | 3. Apresenta o desafio solicitando a identificação do componente, do conector ou do estado aparente. |
| 4. Seleciona as respostas e confirma. |  |
|  | 5. Compara as respostas com os itens de controle para validar a natureza humana do autor. |
|  | 6. Libera a operação original, registra as respostas dos itens pendentes como rotulagem colaborativa e credita as moedas de participação. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se as respostas de controle estiverem incorretas, gera um novo desafio de dificuldade equivalente. |
|  | 2. Após três falhas consecutivas, aplica o captcha convencional e registra o evento para análise de segurança. |
|  | 3. Se as respostas de um item pendente divergirem entre os usuários, mantém o item sem rótulo definitivo e o encaminha para curadoria. |
|  | 4. Se o banco de imagens estiver indisponível, aplica o captcha convencional. |

### Aba: `STY047 - Recolhimento Dados IA`

| Nome do Caso de Uso | Recolhimento de dados para treino de IA (admin) |
| --- | --- |
| Finalidade/Objetivo: | Selecionar, anonimizar e exportar conjuntos de dados da plataforma para o treinamento dos modelos de inteligência artificial, em conformidade com a política de privacidade. |
| Ator(es): | Back-office User |
| Pré-Condições: | O ator possui perfil administrativo com permissão de acesso a dados. Existe base legal e consentimento registrado para o uso pretendido. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa o módulo de dados e define o escopo do conjunto: período, categorias, tipos de mídia e volume desejado. |  |
|  | 2. Apresenta a prévia do volume elegível, excluindo automaticamente os registros de usuários sem consentimento e os dados sob restrição. |
| 3. Registra a finalidade do tratamento e a base legal aplicável e confirma a extração. |  |
|  | 4. Executa a anonimização: remove identificadores diretos, metadados de localização e dados pessoais presentes em imagens e textos. |
|  | 5. Gera o conjunto de dados versionado com o dicionário de campos, o hash de integridade e o relatório de composição. |
|  | 6. Disponibiliza o conjunto no repositório restrito e registra a operação em log de auditoria com o responsável e a finalidade. |
| 7. Valida a amostra do conjunto gerado e homologa sua utilização. |  |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se o escopo solicitado incluir dados sem base legal, bloqueia a extração e informa os registros impedidos. |
|  | 2. Se a anonimização identificar resíduo de dado pessoal, interrompe a geração e sinaliza os registros afetados para tratamento manual. |
|  | 3. Se o volume elegível for insuficiente para o treinamento, informa a limitação e sugere a ampliação do período. |
| 4. Um titular solicita a revogação do consentimento; o sistema exclui seus registros das próximas extrações e marca os conjuntos afetados para revisão. |  |

### Aba: `STY048 - Atualizacao da IA`

| Nome do Caso de Uso | Atualização da IA (admin) |
| --- | --- |
| Finalidade/Objetivo: | Avaliar, homologar e promover uma nova versão de modelo de inteligência artificial ao ambiente produtivo, com possibilidade de reversão. |
| Ator(es): | Back-office User |
| Pré-Condições: | Existe versão candidata de modelo treinada e registrada no repositório. O ator possui permissão de promoção de modelos. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa o módulo de modelos e seleciona a versão candidata. |  |
|  | 2. Apresenta as métricas da candidata frente à versão em produção: acurácia, taxa de erro por categoria, latência e viés por classe. |
| 3. Solicita a execução da avaliação em ambiente de homologação com o conjunto de teste padrão. |  |
|  | 4. Executa a avaliação, compara os resultados com os critérios mínimos de aceitação e apresenta o parecer técnico. |
| 5. Define a estratégia de promoção (implantação gradual por percentual de tráfego) e confirma. |  |
|  | 6. Promove a versão conforme o percentual definido, monitora as métricas em produção e mantém a versão anterior disponível para reversão. |
|  | 7. Ao atingir a estabilidade prevista, conclui a promoção, registra a nova versão vigente e notifica os responsáveis. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se a candidata não atingir os critérios mínimos de aceitação, bloqueia a promoção e apresenta as métricas reprovadas. |
|  | 2. Se as métricas em produção degradarem durante a implantação gradual, executa a reversão automática para a versão anterior e notifica os responsáveis. |
|  | 3. Se for identificado viés relevante em alguma categoria, retém a promoção e exige parecer expresso antes de prosseguir. |
| 4. Solicita a reversão manual; o sistema restaura a versão anterior e registra a justificativa em auditoria. |  |

### Aba: `STY049 - Realizar Denuncia`

| Nome do Caso de Uso | Realizar denúncia |
| --- | --- |
| Finalidade/Objetivo: | Registrar a denúncia de um conteúdo ou de um usuário, encaminhando-a à fila de análise da moderação. |
| Ator(es): | Usuário |
| Pré-Condições: | O ator está autenticado e o objeto denunciado existe e está visível na plataforma. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Aciona a opção de denunciar no anúncio, no perfil ou na mensagem. |  |
|  | 2. Apresenta os motivos de denúncia aplicáveis ao tipo de objeto selecionado. |
| 3. Seleciona o motivo, descreve o ocorrido e anexa as evidências, quando houver. |  |
|  | 4. Valida a completude do registro e vincula automaticamente o objeto denunciado e seu contexto. |
|  | 5. Registra a denúncia com número de protocolo, classifica sua prioridade e a encaminha à fila de moderação. |
|  | 6. Confirma o recebimento ao denunciante, preservando o sigilo da sua identidade perante o denunciado. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se o ator já tiver denunciado o mesmo objeto pelo mesmo motivo, informa o protocolo existente e não gera novo registro. |
|  | 2. Se o motivo for classificado como de risco elevado, aplica a restrição preventiva imediata do conteúdo e prioriza a análise. |
|  | 3. Se o objeto já tiver sido removido, informa a situação e encerra a denúncia automaticamente. |
|  | 4. Se o ator apresentar histórico de denúncias improcedentes acima do limite, reduz a prioridade da sua denúncia e registra o padrão para análise. |

### Aba: `STY050 - Analisar Fin Denuncia`

| Nome do Caso de Uso | Analisar e finalizar denúncia |
| --- | --- |
| Finalidade/Objetivo: | Analisar uma denúncia registrada à luz das políticas da plataforma, registrar a decisão final, aplicar as sanções cabíveis ao usuário infrator e encerrar o processo de moderação. |
| Ator(es): | Moderador User |
| Pré-Condições: | Existe denúncia pendente na fila de moderação e o ator possui perfil de moderação. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa a fila de moderação e assume a denúncia de maior prioridade. |  |
|  | 2. Bloqueia o registro para o ator e apresenta o objeto denunciado, o motivo, as evidências, o histórico do usuário envolvido e a tabela de sanções aplicáveis. |
| 3. Analisa o conteúdo à luz das políticas aplicáveis e consulta as denúncias correlatas. |  |
| 4. Registra o parecer e define o encaminhamento: manutenção do conteúdo, remoção, advertência ao usuário ou escalamento. |  |
|  | 5. Valida a coerência entre o parecer e o encaminhamento selecionado. |
| 6. Seleciona o desfecho, procedente ou improcedente, e, quando cabível, a sanção proporcional à infração e à reincidência. |  |
|  | 7. Valida a proporcionalidade da sanção frente ao histórico e solicita a confirmação. |
| 8. Confirma a decisão. |  |
|  | 9. Executa o encaminhamento, aplica a sanção, atualiza a reputação do usuário, encerra a denúncia e registra a decisão em log de auditoria. |
|  | 10. Notifica o denunciado com a decisão fundamentada e o prazo para recurso, e informa o denunciante sobre a conclusão, sem expor os dados do denunciado. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
| 1. Solicita informações complementares ao denunciante; o sistema suspende o prazo e notifica o solicitado. |  |
| 2. Escala o caso à supervisão por complexidade ou conflito de interesse; o sistema reatribui a denúncia e registra o motivo. |  |
|  | 3. Se o mesmo objeto acumular denúncias acima do limite configurado, aplica a restrição preventiva antes da conclusão da análise. |
|  | 4. Se o ator não concluir a análise no prazo do bloqueio, devolve a denúncia à fila. |
|  | 5. Se a sanção selecionada for de suspensão definitiva, exige a aprovação de um segundo moderador antes da execução. |
| 6. O denunciado apresenta recurso no prazo; o sistema reabre o caso e o encaminha à instância de revisão. |  |
|  | 7. Se a denúncia for julgada improcedente, restaura integralmente o conteúdo restringido preventivamente e registra a restauração. |
|  | 8. Se o usuário já estiver suspenso por outro caso, acumula o registro e recalcula o prazo total da sanção. |

### Aba: `STY051 - Remocao de Post`

| Nome do Caso de Uso | Remoção de post (moderação / admin) |
| --- | --- |
| Finalidade/Objetivo: | Remover da exibição pública um anúncio, um comentário ou uma publicação que viole as políticas da plataforma, com registro do motivo e possibilidade de restauração. |
| Ator(es): | Moderador User/ Back-office User |
| Pré-Condições: | O conteúdo existe e o ator possui permissão de moderação sobre o seu tipo. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Localiza o conteúdo pelo painel de moderação ou pela denúncia associada. |  |
|  | 2. Apresenta o conteúdo integral, seu autor, seu histórico de edições e as denúncias vinculadas. |
| 3. Aciona a remoção, seleciona o motivo e registra a fundamentação. |  |
|  | 4. Solicita a confirmação e apresenta os efeitos da remoção sobre as negociações vinculadas. |
| 5. Confirma a remoção. |  |
|  | 6. Retira o conteúdo da exibição pública, preserva a cópia em área de auditoria e encerra as negociações vinculadas quando aplicável. |
|  | 7. Notifica o autor com o motivo e o prazo para recurso e registra a ação em log de auditoria. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se houver transação em andamento vinculada ao conteúdo, suspende a remoção imediata, bloqueia novas interações e encaminha o caso à mediação. |
| 2. O autor apresenta recurso no prazo; o sistema encaminha o pedido à revisão e mantém o conteúdo removido durante a análise. |  |
|  | 3. Se a revisão der provimento ao recurso, restaura o conteúdo com a situação e o histórico anteriores e notifica o autor. |
|  | 4. Se o conteúdo já tiver sido removido pelo próprio autor, registra apenas a fundamentação da moderação no histórico. |

### Aba: `STY052 - Censura Dados Pessoais`

| Nome do Caso de Uso | Censura de dados pessoais em descrições de produtos (moderação) |
| --- | --- |
| Finalidade/Objetivo: | Detectar e ocultar dados pessoais e canais de contato externos presentes em descrições de anúncios, com revisão humana dos casos duvidosos. |
| Ator(es): | Moderador User |
| Pré-Condições: | Existe conteúdo publicado ou submetido à publicação contendo texto livre. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Executa a análise automática do texto na publicação e na edição, identificando telefones, e-mails, endereços, documentos e perfis externos. |
|  | 2. Aplica a ocultação automática dos trechos identificados com alta confiança e notifica o autor sobre a política aplicada. |
|  | 3. Encaminha os casos de confiança intermediária à fila de revisão da moderação. |
| 4. Acessa a fila de revisão e analisa o trecho sinalizado no contexto do anúncio. |  |
| 5. Confirma a censura, libera o trecho como falso positivo ou amplia a ocultação para outros trechos. |  |
|  | 6. Aplica a decisão, atualiza a exibição pública do anúncio e registra a ação em log de auditoria. |
|  | 7. Utiliza a decisão registrada como retorno para o ajuste dos padrões de detecção. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se a ocultação comprometer a compreensão do anúncio, orienta o autor a reescrever a descrição sem os dados de contato. |
| 2. O autor contesta a censura aplicada; o sistema registra a contestação e a encaminha para nova revisão. |  |
|  | 3. Se o mesmo autor reincidir na exposição de dados de contato acima do limite, encaminha o caso para aplicação de sanção. |
|  | 4. Se o serviço de detecção estiver indisponível, retém as publicações com texto livre para revisão manual e sinaliza a fila. |

### Aba: `STY053 - Geracao de Relatorio`

| Nome do Caso de Uso | Geração de relatório (admin – DaaS) |
| --- | --- |
| Finalidade/Objetivo: | Compor e exportar relatórios analíticos agregados sobre o mercado de hardware usado, respeitando as regras de anonimização e de agregação mínima. |
| Ator(es): | Back-office User |
| Pré-Condições: | O ator possui permissão no módulo de dados e existe volume suficiente de transações no período solicitado. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa o módulo de relatórios e seleciona o modelo desejado ou inicia um relatório personalizado. |  |
|  | 2. Apresenta o catálogo de indicadores disponíveis, as dimensões de segmentação e os filtros aplicáveis. |
| 3. Define o período, os indicadores, as dimensões e o formato de saída. |  |
|  | 4. Valida a combinação solicitada frente às regras de agregação mínima e de anonimização. |
|  | 5. Processa a consulta, calcula os indicadores e apresenta a prévia com os gráficos e as tabelas resultantes. |
| 6. Confere a prévia e confirma a exportação. |  |
|  | 7. Gera o arquivo no formato escolhido, aplica a marca d'água de identificação do destinatário e registra a emissão em log de auditoria. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se a segmentação solicitada resultar em grupos abaixo do tamanho mínimo, bloqueia o detalhamento e apresenta apenas o dado agregado. |
|  | 2. Se o volume de dados exceder o limite de processamento síncrono, agenda a geração em segundo plano e notifica o ator na conclusão. |
|  | 3. Se não houver dados para o período e os filtros informados, informa a ausência de resultados e sugere ajustes. |
|  | 4. Se a exportação falhar, mantém o relatório disponível para nova tentativa e registra o erro. |

### Aba: `STY054 - Gerar Metricas ESG`

| Nome do Caso de Uso | Gerar métricas ESG (usuário / site-wide) |
| --- | --- |
| Finalidade/Objetivo: | Calcular e apresentar as métricas de impacto ambiental, social e de governança, no escopo individual do usuário ou consolidado de toda a plataforma, com rastreabilidade da metodologia aplicada. |
| Ator(es): | Usuário Autenticado/ Back-office User |
| Pré-Condições: | Existe ao menos uma transação concluída no escopo apurado. Para a apuração consolidada, o período está encerrado e as transações estão consolidadas. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa o painel de impacto e define o escopo da apuração: individual, na área da conta, ou consolidado da plataforma, no módulo ESG. |  |
|  | 2. Recupera as transações concluídas do escopo selecionado, com as categorias, os pesos dos itens negociados e a metodologia vigente. |
|  | 3. Aplica os fatores de conversão e calcula a estimativa de resíduo eletrônico evitado, de emissões evitadas e de recursos preservados. |
|  | 4. Na apuração consolidada, calcula também os indicadores sociais, de doações a ONGs e acessibilidade, e os de governança, de denúncias tratadas e prazos cumpridos, por categoria e por região. |
|  | 5. Apresenta as métricas acumuladas, a evolução por período e a comparação com a média da comunidade ou com as metas definidas. |
| 6. Consulta a metodologia de cálculo, as fontes dos fatores utilizados e a memória de cálculo. |  |
| 7. Na apuração consolidada, analisa os resultados, registra as notas metodológicas e homologa o período. |  |
|  | 8. Disponibiliza o certificado de impacto individual para compartilhamento ou congela a versão apurada, gera o relatório público e registra o hash de integridade dos dados. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se não houver transações concluídas, apresenta o painel zerado com a explicação de como as métricas são geradas. |
|  | 2. Se o peso do item negociado não estiver cadastrado, utiliza a média da categoria e sinaliza a estimativa como aproximada. |
|  | 3. Se houver devolução concluída, desconsidera a transação correspondente e recalcula as métricas. |
|  | 4. Se houver transações pendentes de consolidação no período, alerta o ator e permite a apuração apenas em caráter preliminar. |
|  | 5. Se a metodologia tiver sido alterada em relação ao período anterior, exige o registro da justificativa e a recomposição da série histórica. |
|  | 6. Se um indicador apresentar variação atípica frente ao histórico, sinaliza o desvio e exige a análise antes da homologação. |

### Aba: `STY055 - Descricao de Item`

| Nome do Caso de Uso | Descrição de item (site-wide – falha de mortalidade / defeitos crônicos) |
| --- | --- |
| Finalidade/Objetivo: | Apresentar, na página do item, as informações consolidadas de confiabilidade do modelo: taxa de falha estimada, defeitos recorrentes relatados e vida útil esperada. |
| Ator(es): | Usuário |
| Pré-Condições: | O modelo do item possui registros suficientes de negociações, laudos técnicos ou relatos de defeito na plataforma. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa a página de uma oferta ou de um modelo no catálogo. |  |
|  | 2. Recupera os dados agregados do modelo: laudos técnicos emitidos, defeitos relatados, devoluções e reclamações associadas. |
|  | 3. Calcula a taxa de falha estimada por faixa de tempo de uso e identifica os defeitos crônicos mais recorrentes. |
|  | 4. Exibe o painel de confiabilidade com a taxa de falha, os sintomas típicos, os pontos de atenção na inspeção e a vida útil média observada. |
| 5. Consulta os relatos detalhados e a origem dos dados apresentados. |  |
|  | 6. Apresenta os relatos anonimizados, o tamanho da amostra e a data da última atualização dos indicadores. |
| 7. Opcionalmente, registra um novo relato de defeito para o modelo que possui. |  |
|  | 8. Valida o relato, vincula-o a uma transação ou a um laudo e recalcula os indicadores do modelo. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se a amostra for inferior ao mínimo estatístico, exibe o aviso de dados insuficientes e omite a taxa de falha. |
|  | 2. Se o relato registrado não puder ser vinculado a uma transação ou a um laudo, classifica-o como não verificado e o exclui do cálculo dos indicadores. |
|  | 3. Se houver indício de relatos coordenados para depreciar um modelo, sinaliza o padrão para a moderação e suspende a atualização dos indicadores. |
|  | 4. Se o fabricante contestar formalmente os dados, registra a manifestação junto ao painel de confiabilidade. |

### Aba: `STY056 - Checamento de Logs`

| Nome do Caso de Uso | Checamento de logs (admin) |
| --- | --- |
| Finalidade/Objetivo: | Consultar, filtrar e exportar os registros de auditoria das operações realizadas na plataforma, com controle de acesso e rastreabilidade da própria consulta. |
| Ator(es): | Back-office User |
| Pré-Condições: | O ator possui permissão de acesso à auditoria e os logs do período consultado estão dentro do prazo de retenção. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa o módulo de auditoria e define os filtros: período, tipo de evento, usuário, recurso afetado e origem. |  |
|  | 2. Valida o nível de permissão do ator frente à sensibilidade dos eventos solicitados. |
|  | 3. Consulta a base de logs e apresenta os registros com data, hora, autor, ação, recurso, resultado e endereço de origem. |
| 4. Analisa a sequência de eventos e detalha um registro específico. |  |
|  | 5. Exibe o conteúdo completo do registro, com os dados sensíveis mascarados conforme o perfil do ator. |
| 6. Solicita a exportação do resultado da consulta para instrução do incidente. |  |
|  | 7. Gera o arquivo assinado com hash de integridade e registra a própria consulta e a exportação em log de auditoria. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se o período solicitado exceder o prazo de retenção, informa a indisponibilidade e apresenta o intervalo disponível. |
|  | 2. Se o ator não possuir permissão para o tipo de evento solicitado, omite os registros restritos e informa a limitação aplicada. |
|  | 3. Se o volume do resultado exceder o limite de exibição, exige o refinamento dos filtros ou agenda a exportação em segundo plano. |
|  | 4. Se for detectada tentativa de alteração nos registros, aciona o alerta de integridade e notifica a equipe de segurança. |

### Aba: `STY057 - Consultar Guia`

| Nome do Caso de Uso | Consultar guia informativo |
| --- | --- |
| Finalidade/Objetivo: | Disponibilizar o acervo de conteúdos educativos sobre hardware, compra segura, manutenção e descarte responsável, bem como a ficha de cada modelo com especificações e faixa de preço praticada na plataforma. |
| Ator(es): | Usuário |
| Pré-Condições: | Existe conteúdo publicado na base editorial e o modelo consultado possui histórico de negociações ou ofertas ativas. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
| 1. Acessa a área do guia informativo. |  |
|  | 2. Apresenta as trilhas de conteúdo organizadas por tema, nível de conhecimento e categoria de hardware. |
| 3. Navega pelas trilhas ou pesquisa um termo específico. |  |
|  | 4. Filtra os conteúdos correspondentes e exibe os resultados com título, resumo e tempo estimado de leitura. |
| 5. Seleciona um conteúdo para leitura ou um modelo específico do catálogo. |  |
|  | 6. Exibe o conteúdo com as referências e os conteúdos relacionados ou, no caso de um modelo, recupera as especificações técnicas, o histórico de preços e as ofertas ativas correspondentes. |
|  | 7. Calcula a faixa de preço praticada no período, com valores mínimo, mediano e máximo por estado de conservação, e exibe o gráfico de evolução de preços. |
| 8. Compara as ofertas ativas listadas e consulta a classificação de cada uma frente à faixa praticada. |  |
|  | 9. Sinaliza as ofertas abaixo, dentro e acima da faixa e permite a criação de alerta de preço para o modelo. |
| 10. Avalia a utilidade do conteúdo e, opcionalmente, salva-o para leitura posterior. |  |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se a pesquisa não retornar resultados, sugere termos relacionados e apresenta os conteúdos mais acessados. |
|  | 2. Se o conteúdo estiver desatualizado além do prazo de revisão, exibe o aviso de revisão pendente. |
|  | 3. Se não houver histórico suficiente de negociações, apresenta apenas as ofertas ativas e informa a ausência de referência consolidada. |
|  | 4. Se houver variação atípica de preços no período, sinaliza a volatilidade e amplia a janela de apuração. |
|  | 5. Se o modelo estiver descontinuado, exibe o aviso de descontinuidade e sugere os modelos equivalentes atuais. |
|  | 6. Se o usuário não estiver autenticado, permite a leitura mas condiciona o salvamento, a avaliação e os alertas de preço à autenticação. |

### Aba: `STY058 - Sugestao de Ecoponto`

| Nome do Caso de Uso | Sugestão de ecoponto oficial ao usuário caso ele não consiga vender o item (reciclagem) |
| --- | --- |
| Finalidade/Objetivo: | Sugerir ao usuário os pontos oficiais de coleta e de logística reversa adequados ao item não vendido, registrando o encaminhamento para fins de métricas ESG. |
| Ator(es): | Usuário (Vendedor) |
| Pré-Condições: | Existe oferta encerrada sem venda pertencente ao ator ou solicitação direta de descarte. A base de ecopontos está atualizada. |
| Fluxo Principal |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Ao encerrar uma oferta sem venda, apresenta ao vendedor as alternativas de destinação: republicar, doar a uma ONG ou encaminhar para reciclagem. |
| 2. Seleciona a opção de encaminhamento para reciclagem. |  |
|  | 3. Solicita a localização do usuário e identifica os ecopontos oficiais e os programas de logística reversa que aceitam a categoria do item. |
|  | 4. Apresenta os pontos ordenados por distância, com endereço, horário de funcionamento, categorias aceitas e exigências de preparo do item. |
| 5. Seleciona o ponto desejado e consulta a rota até o local. |  |
|  | 6. Gera a rota, apresenta as orientações de preparo (remoção de dados, pilhas e baterias) e registra a intenção de descarte. |
| 7. Confirma a realização do descarte e, opcionalmente, anexa o comprovante fornecido pelo ponto de coleta. |  |
|  | 8. Contabiliza o item nas métricas ESG do usuário e da plataforma e credita as moedas de incentivo à reciclagem. |
| Fluxo Alternativo |  |
| Ações do Ator | Ações do Sistema |
|  | 1. Se não houver ecoponto que aceite a categoria no raio informado, apresenta os programas de coleta por correspondência dos fabricantes e as campanhas itinerantes previstas. |
|  | 2. Se o item ainda tiver valor de uso, sugere previamente a doação a uma ONG com pedido ativo compatível antes da reciclagem. |
| 3. Não confirma o descarte no prazo previsto; o sistema envia lembrete e não contabiliza o item nas métricas ESG. |  |
|  | 4. Se o ponto selecionado estiver desativado na base, sinaliza a desatualização, sugere alternativa e encaminha a correção para curadoria. |
