# Regras de Negócio — Projeto Steely

> **Arquivos Originais:** [`originais/Documento_de_Regras_de_Negocio.pdf`](originais/Documento_de_Regras_de_Negocio.pdf) · [`originais/Regras_de_Negocio_Steely_v1.xlsx`](originais/Regras_de_Negocio_Steely_v1.xlsx)

---

## 1. Regras de Negócio Macro (`RB-01` a `RB-15`)

| Código | Regra | Descrição | Validação Sistêmica | Importância | ADRs |
| --- | --- | --- | --- | --- | --- |
| **RB-01** | Verificação de Identidade (KYC) | É obrigatório o envio e validação de documento de identificação para interagir com o Mural Institucional, negociar grandes lotes ou participar de Leilões. | Bloqueio de acesso na API e nas funções SQL (`kyc_verified = TRUE`) se a conta não estiver validada. | Alta | `ADR-09`, `ADR-15` |
| **RB-02** | Restrição de Material Perigoso | Não é permitida a publicação de itens com risco químico ou físico (ex.: baterias estufadas/vazando ou materiais tóxicos). | Bloqueio da submissão do formulário e redirecionamento para orientação de descarte em Ecoponto. | Alta | `ADR-08`, `ADR-19` |
| **RB-03** | SLA de Resposta à Reserva (48 h) | O sistema deve cancelar automaticamente a reserva se o vendedor não responder à solicitação em até 48 horas. | Job `sweep_reservas_48h` no `pg_cron` retorna a oferta para `ATIVA`/`Disponível` sem aplicar strike, enviando alerta 6 h antes. | Média | `ADR-16`, `ADR-25` |
| **RB-04** | Integridade de Dados (*Data Safe*) | Toda oferta de hardware com armazenamento (HDD, SSD, NVMe, PC montado) deve declarar obrigatoriamente a situação de sanitização dos dados. | Impedimento de publicação na validação Zod/Pydantic sem preenchimento da declaração. | Alta | `ADR-09`, `ADR-19` |
| **RB-05** | Penalidade de *No-Show* | O descumprimento de agendamento presencial confirmado (tolerância de 60 min) ou cancelamento tardio gera registro de *strike*. | Registro em `public.sancoes` e suspensão automática da conta no 3º *strike*. | Média | `ADR-09`, `ADR-16` |
| **RB-06** | Sigilo de Localização Exata | O endereço exato da coleta/encontro só pode ser revelado após o aceite formal da reserva e com agendamento ativo. | Endereço isolado em `private.oferta_enderecos_exatos`; oferta pública expõe apenas `bairro_aproximado` e rota é calculada no FastAPI. | Alta | `ADR-08`, `ADR-09`, `ADR-26` |
| **RB-07** | Confirmação Presencial via QR Code | A entrega só pode ser confirmada mediante leitura presencial do QR Code único assinado digitalmente (`Ed25519`, `jti` de uso único). | Validação criptográfica offline em `≤ 150 ms` (`ADR-24`) e retenção imediata no schema `escrow` com `Idempotency-Key` (`ADR-03`, `ADR-14`). | Alta | `ADR-03`, `ADR-14`, `ADR-23`, `ADR-24` |
| **RB-08** | Geração de Moedas (Incentivos Virtuais) | O utilizador ganha moedas virtuais ao usar o Scanner IA (`≥ 80%`), ao rotular imagens com consenso no Hardware Captcha e ao emitir Laudos Pós-Compra válidos. | Crédito no ledger `append-only` (`ADR-10`) apenas após confirmação sistêmica/consenso e liberação da custódia, respeitando tetos diário (200) e mensal (2.000). | Alta | `ADR-01`, `ADR-03`, `ADR-10`, `ADR-12` |
| **RB-09** | Queima e Restrição de Moedas Virtuais | O saldo de moedas virtuais é estritamente restrito ao ecossistema (taxa de participação em Leilões, Boost e desconto em taxas internas), sendo proibida qualquer conversão em dinheiro real (*fiat*). | Separação física e contábil entre o schema `escrow` (reais simulados em centavos) e o `wallet_ledger` (moedas virtuais). | Alta | `ADR-03`, `ADR-10`, `ADR-15` |
| **RB-10** | Sistema de Confiança (*Trust Score*) | Respostas fraudulentas/aleatórias no Captcha ou nos Laudos reduzem o *Trust Score* do usuário. | Suspensão automática de ganhos de moedas, cashback e participação em leilões se `trust_score < 70`. | Crítica | `ADR-09`, `ADR-10`, `ADR-15` |
| **RB-11** | Garantia de 7 Dias e Resolução de Disputas | O valor da transação fica retido por 7 dias (168 h contadas do `entregue_em` do servidor); se houver devolução, laudo com falha ou disputa, a liberação é bloqueada. | Funções `private.reter_escrow`, `release_escrow` e `estornar_escrow`, rubrica objetiva de 5 critérios e dupla aprovação para valores `> R$ 500,00`. | Alta | `ADR-03`, `ADR-06`, `ADR-09`, `ADR-16` |
| **RB-12** | Isenção e Impulso Institucional | Instituições verificadas (ONGs e Escolas) recebem impulsionamento gratuito automático para seus pedidos no Mural Institucional. | Desconto de 100% (`Impulsao` tipo `ONG`) para contas em `public.organizacoes_verificadas` com status aprovado. | Média | `ADR-08`, `ADR-09` |
| **RB-13** | Expiração de Oferta (30 dias) | Uma oferta sem solicitações por 30 dias é marcada automaticamente como `EXPIRADA`. | Varredura diária no `pg_cron` altera o status e notifica o vendedor. | Baixa | `ADR-16`, `ADR-25` |
| **RB-14** | Acionamento de Rota B (Ecoponto / Doação) | Se a oferta ficar inativa por 15 dias, expirar aos 30 dias ou for declarada sem conserto, o sistema sugere doação a ONG compatível ou encaminhamento a Ecoponto oficial. | Notificação push e exibição de rota para Ecopontos próximos. | Baixa | `ADR-16`, `ADR-25`, `ADR-26` |
| **RB-15** | Censura Anti-Fuga de Contatos e PII | O sistema deve bloquear/censurar números de telefone, e-mails, links externos, arrobas e chaves Pix em anúncios e no chat antes da reserva confirmada. | Pipeline determinístico no FastAPI (`ADR-02`) + espelho Zod no cliente (`ADR-19`) + `ProxyCensuraMensagem`, recusando com `422 PII_OR_CONTACT_DETECTED` e gravando hash `SHA-256` na auditoria. | Alta | `ADR-02`, `ADR-05`, `ADR-19` |

---

## Planilha: `Regras de Negócio`

| Código | Caso de Uso | Nº Regra | Regra de Negócio |
| --- | --- | --- | --- |
| STYG | Manter Geral | RN01 | Somente usuário autenticado e com permissão sobre a entidade pode realizar operações de manutenção (inclusão, alteração, inativação). |
|  |  | RN02 | Campos obrigatórios, formato e regras de negócio dos dados informados devem ser validados antes da persistência. |
|  |  | RN03 | Dados que não admitem duplicidade devem ter a unicidade validada. |
|  |  | RN04 | Toda operação de persistência deve ser registrada em log de auditoria. |
|  |  | RN05 | A inativação de um registro deve verificar a existência de vínculos ativos; havendo vínculos, a inativação é bloqueada e os vínculos impeditivos são apresentados. |
|  |  | RN06 | Registros inativados devem preservar o histórico. |
|  |  | RN07 | Se o registro tiver sido alterado por outro ator durante a edição, o sistema deve detectar o conflito de concorrência e apresentar a versão atual. |
| STY001 | Realizar cadastro | RN01 | Só pode ser criada conta para visitante sem conta ativa vinculada ao e-mail ou ao CPF informado (unicidade de e-mail e CPF). |
|  |  | RN02 | O cadastro exige o aceite dos Termos de Uso e da Política de Privacidade; sem aceite, o envio é bloqueado. |
|  |  | RN03 | A senha deve atender a critérios mínimos de segurança. |
|  |  | RN04 | O envio do cadastro exige a resolução prévia de captcha. |
|  |  | RN05 | A conta é registrada com situação 'pendente de verificação' até a confirmação do código enviado por e-mail. |
|  |  | RN06 | O código de verificação possui prazo de validade e é invalidado após três tentativas incorretas, disponibilizando o reenvio. |
|  |  | RN07 | A ativação da conta credita as moedas de boas-vindas ao usuário. |
| STY002 | Realizar login | RN01 | O login requer conta ativa e verificada. |
|  |  | RN02 | Mensagens de falha de autenticação devem ser genéricas, sem indicar qual campo (e-mail ou senha) está incorreto. |
|  |  | RN03 | Após três tentativas malsucedidas, exige-se a resolução de captcha antes de nova tentativa. |
|  |  | RN04 | Após cinco tentativas malsucedidas, a conta é bloqueada temporariamente e o titular é notificado por e-mail. |
|  |  | RN05 | Se a conta possuir 2FA habilitado, o segundo fator é exigido antes da conclusão do login. |
|  |  | RN06 | Contas suspensas ou pendentes de verificação não podem efetuar login; o sistema informa a ação necessária para regularização. |
|  |  | RN07 | Todo acesso bem-sucedido deve ser registrado em log. |
| STY003 | Login por serviços (OAuth / redes sociais) | RN01 | O login social requer que o provedor de identidade externo esteja habilitado e disponível. |
|  |  | RN02 | Se não existir conta local vinculada ao identificador retornado pelo provedor, o sistema cria a conta e exige a complementação dos dados obrigatórios ausentes. |
|  |  | RN03 | Se o e-mail retornado pelo provedor já pertencer a uma conta local, exige-se autenticação por senha antes de vincular as identidades. |
|  |  | RN04 | Se o usuário negar a autorização, ou o provedor/token for inválido, o sistema oferece o login por e-mail e senha como alternativa. |
| STY004 | Autenticação por captcha (login, cadastro, compra e formulários) | RN01 | O captcha é acionado conforme regras de risco configuradas para operações sensíveis. |
|  |  | RN02 | O nível de risco da sessão (frequência de requisições, reputação de origem e histórico de falhas) determina o desafio apresentado. |
|  |  | RN03 | Após três falhas consecutivas, aplica-se bloqueio temporário à origem e o evento é registrado para análise de segurança. |
|  |  | RN04 | Se o serviço de verificação estiver indisponível, aplica-se um desafio alternativo interno. |
| STY005 | Recuperação de conta | RN01 | A mensagem de confirmação de envio deve ser neutra mesmo quando o e-mail informado não estiver cadastrado, para não revelar a existência da conta. |
|  |  | RN02 | O link de recuperação possui prazo de validade e uso único; expirado ou já utilizado, é considerado inválido. |
|  |  | RN03 | Contas com 2FA habilitado exigem o segundo fator antes de permitir a redefinição da senha. |
|  |  | RN04 | A nova senha não pode ser igual a uma das últimas senhas utilizadas. |
|  |  | RN05 | A redefinição de senha encerra todas as sessões ativas e notifica o titular por e-mail. |
| STY006 | Requisitar código de login | RN01 | O código de uso único possui prazo de validade e é invalidado após o uso. |
|  |  | RN02 | Após três tentativas incorretas, o código é invalidado e uma nova solicitação é exigida. |
|  |  | RN03 | Existe um intervalo mínimo obrigatório entre solicitações de novo código. |
| STY007 | Setup de 2FA | RN01 | Os métodos suportados são aplicativo autenticador ou código por e-mail. |
|  |  | RN02 | A habilitação do 2FA exige a validação do código gerado antes de concluir a configuração. |
|  |  | RN03 | A desativação do 2FA exige a senha atual e um código válido. |
|  |  | RN04 | Os códigos de recuperação são apresentados uma única vez ao usuário. |
|  |  | RN05 | O abandono do processo antes da validação descarta o segredo gerado. |
|  |  | RN06 | Toda alteração no 2FA é registrada em log e notificada ao titular por e-mail. |
| STY008 | Alterar senha | RN01 | A alteração exige a confirmação da senha atual. |
|  |  | RN02 | A nova senha deve atender aos critérios mínimos de segurança e ser diferente da senha atual. |
|  |  | RN03 | A alteração de senha encerra as demais sessões ativas e notifica o titular por e-mail. |
| STY009 | Deslogar | RN01 | O encerramento de sessão pode ser pontual (dispositivo atual) ou aplicado a todos os dispositivos. |
|  |  | RN02 | O encerramento em todos os dispositivos notifica o titular por e-mail. |
| STY010 | Requisitar deleção de conta | RN01 | A exclusão é bloqueada caso existam transação, leilão ou reclamação em andamento. |
|  |  | RN02 | A existência de saldo de moedas exige confirmação adicional, alertando sobre a perda do saldo. |
|  |  | RN03 | A solicitação de exclusão exige a confirmação da senha atual. |
|  |  | RN04 | Existe um prazo de carência para arrependimento, durante o qual o titular pode reativar a conta. |
|  |  | RN05 | Após a efetivação, o perfil público é anonimizado e os dados sujeitos à retenção legal são preservados. |
| STY011 | Ver perfil | RN01 | Perfis suspensos ou removidos exibem apenas a indicação de indisponibilidade, sem os dados do usuário. |
|  |  | RN02 | Visitantes não autenticados têm os dados de contato ocultos e as ações interativas condicionadas à autenticação. |
| STY012 | Avaliar usuário | RN01 | A avaliação só pode ser feita após a conclusão da transação entre as partes e dentro do prazo definido. |
|  |  | RN02 | Cada ator pode avaliar a mesma transação uma única vez, sendo permitida a edição apenas dentro do prazo previsto. |
|  |  | RN03 | O comentário é validado quanto à presença de dados pessoais e linguagem ofensiva; se reprovado, fica retido para moderação. |
|  |  | RN04 | O registro da avaliação recalcula a reputação média da contraparte. |
|  |  | RN05 | A avaliação concede moedas de recompensa ao avaliador. |
|  |  | RN06 | O avaliado pode contestar a avaliação recebida, encaminhando-a para análise da moderação. |
| STY013 | Montador de setup | RN01 | Os componentes selecionados devem ser compatíveis entre si (soquete, memória, alimentação, dimensões e conectores); a incompatibilidade bloqueia a inclusão. |
|  |  | RN02 | A fonte de alimentação selecionada deve suportar o consumo estimado da configuração. |
|  |  | RN03 | O custo acumulado da montagem é comparado ao orçamento informado, sinalizando eventual excedente. |
|  |  | RN04 | Ofertas vinculadas ao setup que forem encerradas marcam o item como indisponível, mantendo a especificação para substituição. |
| STY014 | Cálculo de setup | RN01 | O cálculo requer que os componentes mínimos obrigatórios estejam definidos. |
|  |  | RN02 | Componente sem dados de benchmark utiliza a média da categoria, sinalizada como estimativa aproximada. |
|  |  | RN03 | Gargalo acima do limite aceitável é destacado, com apresentação das opções de correção. |
| STY015 | Tendências de setup | RN01 | A exibição de tendências exige volume mínimo de montagens e transações no período; abaixo do mínimo, informa-se a insuficiência amostral. |
| STY016 | Publicar oferta | RN01 | O vendedor deve estar autenticado, com perfil verificado, e não pode exceder o limite de anúncios ativos do seu plano. |
|  |  | RN02 | As imagens têm formato, tamanho e quantidade limitados, e os metadados de localização são removidos automaticamente. |
|  |  | RN03 | A descrição não pode conter dados pessoais (telefone, e-mail, endereço); trechos identificados sofrem censura automática. |
|  |  | RN04 | Preço divergente de forma significativa da referência de mercado exige confirmação e gera alerta de risco de anúncio fraudulento. |
|  |  | RN05 | Toda oferta é submetida à triagem automática de moderação; itens proibidos identificados são retidos para análise. |
|  |  | RN06 | Atingido o limite de anúncios ativos do plano, a publicação é bloqueada até o encerramento de um anúncio ou a contratação de plano superior. |
| STY017 | Scanner IA | RN01 | O uso do scanner requer ao menos uma imagem do item. |
|  |  | RN02 | Imagens de baixa qualidade (desfoque, enquadramento ou iluminação inadequados) são rejeitadas, com orientação para nova captura. |
|  |  | RN03 | Grau de confiança da identificação abaixo do mínimo apresenta até três hipóteses mais prováveis para escolha manual. |
|  |  | RN04 | Componente não identificado no catálogo é encaminhado para curadoria, mantendo-se o preenchimento manual. |
| STY018 | Impulsão de oferta (pago / ONG) | RN01 | A oferta a ser impulsionada deve estar ativa e pertencer ao ator solicitante. |
|  |  | RN02 | O pagamento pode ser feito por cartão, por moedas ou por cota gratuita concedida a ONG verificada. |
|  |  | RN03 | ONG sem verificação concluída não pode utilizar a cota gratuita de impulsionamento. |
|  |  | RN04 | A pausa ou o encerramento da oferta durante o período contratado suspende o destaque e recalcula o saldo restante do plano. |
| STY019 | Alterar status do anúncio (pausar / reabrir) | RN01 | A pausa é bloqueada se houver agendamento confirmado ou leilão ativo vinculado à oferta. |
|  |  | RN02 | Oferta que permanecer pausada além do prazo máximo é encerrada automaticamente, com notificação ao vendedor. |
|  |  | RN03 | A reabertura é bloqueada se o limite de anúncios ativos do plano tiver sido atingido. |
|  |  | RN04 | Oferta encerrada por decisão de moderação não pode ser reaberta. |
|  |  | RN05 | A reabertura submete o anúncio a nova triagem automática de moderação. |
|  |  | RN06 | Expirado o prazo máximo de reabertura, orienta-se a criação de um novo anúncio a partir da cópia dos dados anteriores. |
| STY020 | Buscar e filtrar ofertas | RN01 | Ofertas impulsionadas são destacadas conforme a sinalização de patrocínio na ordenação dos resultados. |
|  |  | RN02 | Se o valor mínimo informado no filtro de preço for superior ao máximo, o sistema inverte automaticamente os limites e sinaliza o ajuste. |
|  |  | RN03 | O salvamento de buscas e o recebimento de alertas de novas ofertas são condicionados à autenticação do usuário. |
| STY021 | Enviar mensagem | RN01 | O envio de mensagens requer que o ator esteja autenticado, a oferta esteja ativa e o chat não esteja encerrado nem bloqueado. |
|  |  | RN02 | Mensagens contendo dados de contato ou links externos têm o trecho identificado ocultado automaticamente. |
|  |  | RN03 | Anexos têm formato, tamanho e quantidade limitados por mensagem e passam por verificação antivírus e de conteúdo impróprio. |
|  |  | RN04 | O envio é impedido se o destinatário tiver bloqueado o remetente. |
|  |  | RN05 | Oferta encerrada mantém o histórico do chat apenas em modo de leitura. |
| STY022 | Configurar mensagem automática de vendedor | RN01 | O texto da mensagem automática não pode conter dados de contato externos. |
|  |  | RN02 | O texto está sujeito a um limite máximo de caracteres. |
|  |  | RN03 | A desativação da mensagem automática mantém o texto salvo, apenas interrompendo o envio automático. |
| STY023 | Deleção de mensagem (usuário) | RN01 | A mensagem só pode ser excluída pelo seu autor. |
|  |  | RN02 | A exclusão 'para todos' só é permitida dentro de um prazo definido; expirado o prazo, é permitida apenas a exclusão para o próprio ator. |
|  |  | RN03 | Mensagem vinculada a denúncia ou reclamação em andamento não pode ser excluída. |
|  |  | RN04 | O registro original é mantido em área de auditoria pelo prazo legal, mesmo após a exclusão da visualização do chat. |
| STY024 | Encerramento de chat (usuário) | RN01 | O encerramento é bloqueado quando há agendamento confirmado, exigindo o cancelamento prévio deste. |
|  |  | RN02 | Chat com reclamação aberta permanece ativo até a decisão da moderação. |
|  |  | RN03 | A reabertura da conversa é permitida dentro de um prazo determinado após o encerramento. |
| STY025 | Agendar horário | RN01 | O agendamento requer negociação em andamento, oferta ativa e disponibilidade cadastrada do vendedor. |
|  |  | RN02 | O agendamento é registrado com situação 'pendente de confirmação' até o aceite do vendedor. |
|  |  | RN03 | A confirmação do vendedor gera o QR Code do encontro. |
|  |  | RN04 | A solicitação expira automaticamente se o vendedor não responder dentro do prazo. |
|  |  | RN05 | Local fora dos pontos seguros cadastrados exige confirmação adicional de ambas as partes. |
| STY026 | Cancelar agendamento | RN01 | Só é possível cancelar agendamento confirmado e ainda não realizado. |
|  |  | RN02 | Cancelamento fora do prazo mínimo de antecedência é registrado como tardio e impacta a reputação do ator. |
|  |  | RN03 | Não é permitido cancelar após o início do encontro (leitura do QR Code); nesse caso, orienta-se a abertura de reclamação. |
|  |  | RN04 | O acúmulo de cancelamentos tardios acima do limite restringe temporariamente a criação de novos agendamentos. |
|  |  | RN05 | O cancelamento invalida o QR Code gerado e libera a agenda do vendedor. |
| STY027 | Geração de QR Code | RN01 | O código gerado é único, assinado e vinculado ao agendamento e à transação, com prazo de validade atrelado à janela do encontro. |
|  |  | RN02 | O cancelamento do agendamento invalida imediatamente o código gerado. |
|  |  | RN03 | Suspeita de compartilhamento indevido revoga o código, exigindo nova geração pelo titular autenticado. |
| STY028 | Escanear QR Code | RN01 | A leitura exige a validação da assinatura, da vigência e do vínculo do código com o agendamento e a transação. |
|  |  | RN02 | Código expirado, cancelado, já utilizado ou pertencente a outro agendamento é recusado ou bloqueado. |
|  |  | RN03 | A confirmação da entrega credita moedas de cashback e habilita a avaliação recíproca entre as partes. |
|  |  | RN04 | Sem conexão de rede, a leitura é armazenada localmente e sincronizada quando o acesso for restabelecido. |
| STY029 | Gerar e consultar rota | RN01 | A geração de rota requer agendamento confirmado com local definido. |
|  |  | RN02 | A rota deve permanecer disponível para consulta em modo offline, com os dados armazenados localmente no dispositivo. |
|  |  | RN03 | Alteração ou cancelamento do agendamento ocorrido enquanto o dispositivo estava offline gera alerta de divergência após a sincronização. |
|  |  | RN04 | Armazenamento local expirado exige nova sincronização antes da exibição da rota. |
| STY030 | Laudo técnico | RN01 | A solicitação requer negociação em andamento, item elegível para laudo na categoria e técnico parceiro disponível na região. |
|  |  | RN02 | A solicitação exige a anuência do vendedor antes da confirmação. |
|  |  | RN03 | Se o vendedor não autorizar a avaliação, a solicitação é cancelada e o valor pago é estornado. |
|  |  | RN04 | Item com divergência em relação ao anunciado habilita a renegociação ou o cancelamento sem ônus para o comprador. |
|  |  | RN05 | Não comparecimento ou não conclusão dos testes pelo técnico no prazo cancela a ordem de serviço, estorna o valor e afeta a avaliação do parceiro. |
| STY031 | Solicitar devolução | RN01 | A solicitação requer transação concluída e prazo de devolução não expirado. |
|  |  | RN02 | O repasse de valor ao vendedor é bloqueado enquanto a solicitação está em análise. |
|  |  | RN03 | Se o vendedor não responder no prazo, a devolução é deferida automaticamente em favor do comprador. |
|  |  | RN04 | A recusa do vendedor converte a solicitação em reclamação. |
|  |  | RN05 | Item devolvido em estado divergente do recebido suspende o estorno e encaminha o caso para mediação. |
| STY032 | Geração de PDF (comprovante) | RN01 | O comprovante só é emitido após a transação ser concluída (entrega confirmada). |
|  |  | RN02 | O documento contém os dados mascarados das partes e um código de autenticidade. |
|  |  | RN03 | Transação com reclamação ou devolução em andamento gera o comprovante com a indicação da pendência. |
| STY033 | Abrir reclamação | RN01 | A abertura requer negociação ou transação vinculada e a ausência de reclamação já aberta para o mesmo fato. |
|  |  | RN02 | A abertura bloqueia o repasse de valores pendentes relacionados à negociação. |
|  |  | RN03 | A contraparte possui prazo para apresentar defesa; sem manifestação, a mediação prossegue à revelia. |
|  |  | RN04 | Fato que indique violação grave dos termos de uso aciona a moderação imediatamente e restringe as ações do usuário envolvido. |
| STY034 | Requisitar escalamento de reclamação | RN01 | O escalamento requer reclamação já analisada em primeiro nível e dentro do prazo definido para o pedido. |
|  |  | RN02 | Pedido sem fato ou evidência nova mantém a decisão anterior, com registro de análise sumária. |
|  |  | RN03 | Reclamação já no nível máximo de atendimento não admite novo escalamento. |
|  |  | RN04 | Os valores envolvidos permanecem bloqueados durante o processo de escalamento. |
| STY035 | Encerrar reclamação | RN01 | O encerramento requer reclamação em análise, com manifestações e evidências das partes disponíveis. |
|  |  | RN02 | O desfecho definido deve ser coerente com as medidas aplicáveis (estorno, liberação de valores, sanção e ajuste de reputação). |
|  |  | RN03 | Sanção de suspensão de conta exige a aprovação de um segundo moderador antes da execução. |
|  |  | RN04 | A decisão é registrada em log de auditoria e notificada às partes com o prazo para solicitar revisão. |
| STY036 | Criação de leilão (admin) | RN01 | Itens ou lotes vinculados devem estar cadastrados e verificados, e não podem estar em outra negociação ou leilão ativo. |
|  |  | RN02 | A data de encerramento deve ser posterior à de abertura, e o incremento mínimo deve ser válido. |
|  |  | RN03 | O leilão pode ser salvo como rascunho, sem publicação e sem reserva dos itens. |
|  |  | RN04 | Cancelamento após a publicação com lances já registrados exige justificativa e notificação aos participantes. |
| STY037 | Participar em leilão | RN01 | A participação requer leilão aberto e usuário autenticado, verificado e com método de pagamento válido cadastrado. |
|  |  | RN02 | O lance deve ser igual ou superior ao valor corrente somado ao incremento mínimo do leilão. |
|  |  | RN03 | Lance registrado nos instantes finais prorroga automaticamente o encerramento, conforme regra configurada. |
|  |  | RN04 | Vencedor que não efetua o pagamento no prazo tem a arrematação cancelada, sofre a penalidade prevista e o lote é oferecido ao segundo colocado. |
| STY038 | Proposta (lote) | RN01 | A proposta requer ofertas ativas do mesmo vendedor que aceitem propostas. |
|  |  | RN02 | O valor proposto deve respeitar o limite mínimo aceito pelo vendedor; abaixo desse limite, a proposta é recusada automaticamente. |
|  |  | RN03 | Os itens do lote ficam reservados durante o prazo de validade da proposta. |
|  |  | RN04 | Contraproposta admite um número limitado de rodadas, conforme configuração. |
|  |  | RN05 | A venda separada de item do lote antes do aceite cancela a proposta. |
|  |  | RN06 | Proposta com prazo de validade expirado sem resposta é cancelada, liberando a reserva dos itens. |
| STY039 | Requisitar cadastro (ONG) | RN01 | A organização não pode possuir cadastro ativo prévio; CNPJ já cadastrado é bloqueado por duplicidade. |
|  |  | RN02 | O cadastro exige documentação completa (estatuto, ata de eleição da diretoria, comprovante de inscrição e documento do responsável). |
|  |  | RN03 | O representante deve declarar a veracidade das informações e aceitar os termos específicos do perfil institucional. |
|  |  | RN04 | Solicitação com documento obrigatório ausente ou ilegível permanece como rascunho até a complementação. |
| STY040 | Verificação de ONG (admin) | RN01 | A aprovação exige o preenchimento do checklist de conformidade e a consulta às bases públicas de validação do CNPJ. |
|  |  | RN02 | A concessão do selo de ONG verificada habilita a cota de impulsionamento gratuito e as funcionalidades institucionais. |
|  |  | RN03 | Situação cadastral irregular identificada na consulta pública exige justificativa expressa do analista para eventual aprovação. |
|  |  | RN04 | O registro de exigência documental suspende a contagem do prazo de análise. |
| STY041 | Publicação de pedido de doações (ONG) | RN01 | A publicação requer selo de ONG verificada ativo e respeito ao limite de pedidos simultâneos. |
|  |  | RN02 | O pedido não pode solicitar valores em dinheiro, apenas doações de equipamentos. |
|  |  | RN03 | A publicação é submetida à triagem de moderação antes de ficar visível no mural. |
|  |  | RN04 | Prazo do pedido expirado sem doações suficientes encerra a publicação, com opção de renovação. |
| STY042 | Verificar moedas (cashback) | RN01 | O saldo bloqueado (créditos pendentes de confirmação) é exibido separadamente do saldo disponível. |
|  |  | RN02 | Carteira bloqueada por análise de fraude exibe apenas o saldo, com uso restrito temporariamente. |
|  |  | RN03 | Moedas próximas da expiração geram alerta ao usuário. |
| STY043 | Resgatar moedas | RN01 | O resgate requer saldo igual ou superior ao valor mínimo definido e conta com verificação de identidade concluída. |
|  |  | RN02 | Existe um limite de quantidade/valor de resgates por período. |
|  |  | RN03 | O resgate pode exigir a confirmação por segundo fator de autenticação. |
|  |  | RN04 | Falha na geração do benefício no destino escolhido estorna as moedas debitadas. |
| STY044 | Gastar moedas | RN01 | O serviço selecionado deve ser elegível ao pagamento com moedas. |
|  |  | RN02 | Saldo insuficiente para o valor integral habilita pagamento híbrido, com complemento cobrado em outro método. |
|  |  | RN03 | Falha na contratação do serviço após o débito estorna as moedas automaticamente. |
| STY045 | Manter método de pagamento | RN01 | Os dados sensíveis do método são tokenizados junto ao provedor; os dados brutos são descartados após o recebimento do token. |
|  |  | RN02 | Método já cadastrado na conta é recusado como duplicidade, mantendo-se o registro existente. |
|  |  | RN03 | A exclusão é bloqueada se houver cobrança pendente ou habilitação ativa em leilão vinculada ao método. |
|  |  | RN04 | Se o método for o único cadastrado e houver serviço recorrente ativo, exige-se o cadastro prévio de um substituto antes da exclusão. |
|  |  | RN05 | Existe um limite máximo de métodos de pagamento cadastrados por conta. |
| STY046 | Hardware Captcha | RN01 | O desafio combina itens de controle, já rotulados, com itens pendentes de rotulagem. |
|  |  | RN02 | A validação da natureza humana do autor é feita comparando as respostas com os itens de controle. |
|  |  | RN03 | Após três falhas consecutivas, aplica-se o captcha convencional em substituição. |
|  |  | RN04 | Respostas divergentes entre usuários para o mesmo item pendente mantêm o item sem rótulo definitivo, encaminhado à curadoria. |
|  |  | RN05 | A participação no desafio credita moedas ao usuário. |
| STY047 | Recolhimento de dados para treino de IA (admin) | RN01 | A extração de dados só é permitida havendo base legal e consentimento registrado para a finalidade pretendida. |
|  |  | RN02 | Registros de usuários sem consentimento e dados sob restrição são automaticamente excluídos do escopo elegível. |
|  |  | RN03 | A anonimização deve remover identificadores diretos, metadados de localização e dados pessoais presentes em imagens e textos. |
|  |  | RN04 | Revogação de consentimento por um titular exclui seus registros das próximas extrações e marca os conjuntos já gerados para revisão. |
| STY048 | Atualização da IA (admin) | RN01 | A promoção de uma versão candidata exige que ela atinja os critérios mínimos de aceitação frente à versão em produção. |
|  |  | RN02 | A implantação é realizada de forma gradual por percentual de tráfego, mantendo-se a versão anterior disponível para reversão. |
|  |  | RN03 | Degradação das métricas em produção durante a implantação gradual aciona a reversão automática para a versão anterior. |
|  |  | RN04 | Viés relevante identificado em qualquer categoria retém a promoção, exigindo parecer expresso antes de prosseguir. |
| STY049 | Realizar denúncia | RN01 | Denúncia duplicada do mesmo objeto, pelo mesmo motivo e pelo mesmo ator, não gera novo registro. |
|  |  | RN02 | Motivo classificado como de risco elevado aplica restrição preventiva imediata ao conteúdo denunciado. |
|  |  | RN03 | A identidade do denunciante é mantida em sigilo perante o denunciado. |
|  |  | RN04 | Histórico de denúncias improcedentes acima do limite reduz a prioridade das novas denúncias do ator. |
| STY050 | Analisar e finalizar denúncia | RN01 | A sanção aplicada deve ser proporcional à infração cometida e à reincidência do usuário. |
|  |  | RN02 | Objeto que acumula denúncias acima do limite configurado recebe restrição preventiva antes da conclusão da análise. |
|  |  | RN03 | Sanção de suspensão definitiva exige a aprovação de um segundo moderador antes da execução. |
|  |  | RN04 | O denunciado pode apresentar recurso dentro do prazo estabelecido, reabrindo o caso para revisão. |
|  |  | RN05 | Denúncia julgada improcedente restaura integralmente o conteúdo restringido preventivamente. |
|  |  | RN06 | Nova suspensão de usuário já suspenso por outro caso acumula o registro e recalcula o prazo total da sanção. |
|  |  | RN07 | A identidade do denunciante não é exposta ao denunciado na comunicação da decisão. |
| STY051 | Remoção de post (moderação / admin) | RN01 | Conteúdo com transação em andamento vinculada tem a remoção imediata suspensa, sendo encaminhado à mediação. |
|  |  | RN02 | Uma cópia do conteúdo removido é preservada em área de auditoria. |
|  |  | RN03 | O autor pode apresentar recurso contra a remoção; o conteúdo permanece removido durante a análise do recurso. |
|  |  | RN04 | Recurso deferido restaura o conteúdo com a situação e o histórico anteriores. |
| STY052 | Censura de dados pessoais em descrições de produtos (moderação) | RN01 | Trechos identificados com alta confiança são ocultados automaticamente, com notificação ao autor sobre a política aplicada. |
|  |  | RN02 | Casos de confiança intermediária são encaminhados para revisão humana da moderação antes da decisão final. |
|  |  | RN03 | O autor pode contestar a censura aplicada, gerando nova revisão do caso. |
|  |  | RN04 | Reincidência do mesmo autor acima do limite configurado é encaminhada para aplicação de sanção. |
|  |  | RN05 | Indisponibilidade do serviço de detecção retém publicações com texto livre para revisão manual. |
| STY053 | Geração de relatório (admin – DaaS) | RN01 | Combinações de filtros que resultem em grupos abaixo do tamanho mínimo de agregação são bloqueadas, exibindo-se apenas o dado agregado. |
|  |  | RN02 | Relatórios cujo volume de dados exceda o limite de processamento síncrono são gerados em segundo plano. |
|  |  | RN03 | O arquivo exportado recebe marca d'água de identificação do destinatário. |
| STY054 | Gerar métricas ESG (usuário / site-wide) | RN01 | A apuração individual exige ao menos uma transação concluída no escopo apurado. |
|  |  | RN02 | A apuração consolidada exige que o período esteja encerrado e as transações, consolidadas. |
|  |  | RN03 | Item negociado sem peso cadastrado utiliza a média da categoria, sinalizada como estimativa. |
|  |  | RN04 | Transações com devolução concluída são desconsideradas no recálculo das métricas. |
|  |  | RN05 | Mudança de metodologia de cálculo exige o registro de justificativa e a recomposição da série histórica. |
|  |  | RN06 | Indicador com variação atípica frente ao histórico é sinalizado e exige análise antes da homologação do período. |
| STY055 | Descrição de item (site-wide – falha de mortalidade / defeitos crônicos) | RN01 | O painel de confiabilidade exige amostra mínima estatística; abaixo do mínimo, a taxa de falha não é exibida. |
|  |  | RN02 | Relato que não puder ser vinculado a uma transação ou a um laudo é classificado como não verificado e excluído do cálculo dos indicadores. |
|  |  | RN03 | Indício de relatos coordenados para depreciar um modelo suspende a atualização dos indicadores e é sinalizado à moderação. |
| STY056 | Checamento de logs (admin) | RN01 | A consulta a logs é restrita ao prazo de retenção e ao nível de permissão do ator frente à sensibilidade dos eventos. |
|  |  | RN02 | Dados sensíveis exibidos no detalhamento do registro são mascarados conforme o perfil do ator. |
|  |  | RN03 | Toda consulta e exportação de logs é registrada em log de auditoria, incluindo a própria consulta. |
|  |  | RN04 | Volume de resultado acima do limite de exibição exige o refinamento dos filtros ou o agendamento da exportação em segundo plano. |
| STY057 | Consultar guia informativo | RN01 | A faixa de preço praticada é calculada com valores mínimo, mediano e máximo, segmentados por estado de conservação. |
|  |  | RN02 | O salvamento de conteúdo, a avaliação e a criação de alertas de preço são condicionados à autenticação do usuário. |
|  |  | RN03 | Conteúdo desatualizado além do prazo de revisão exibe aviso de revisão pendente. |
| STY058 | Sugestão de ecoponto oficial (reciclagem) | RN01 | A sugestão requer oferta encerrada sem venda pertencente ao ator, ou solicitação direta de descarte. |
|  |  | RN02 | A confirmação do descarte deve ocorrer dentro do prazo previsto; não confirmada, não é contabilizada nas métricas ESG. |
|  |  | RN03 | A contabilização nas métricas ESG credita moedas de incentivo à reciclagem. |
|  |  | RN04 | Antes de encaminhar para reciclagem, o sistema sugere prioritariamente a doação a uma ONG com pedido ativo compatível, caso o item ainda tenha valor de uso. |

## Planilha: `Resumo`

| Código | Caso de Uso | Qtd. Regras de Negócio |
| --- | --- | --- |
| STYG | Manter Geral | 7 |
| STY001 | Realizar cadastro | 7 |
| STY002 | Realizar login | 7 |
| STY003 | Login por serviços (OAuth / redes sociais) | 4 |
| STY004 | Autenticação por captcha (login, cadastro, compra e formulários) | 4 |
| STY005 | Recuperação de conta | 5 |
| STY006 | Requisitar código de login | 3 |
| STY007 | Setup de 2FA | 6 |
| STY008 | Alterar senha | 3 |
| STY009 | Deslogar | 2 |
| STY010 | Requisitar deleção de conta | 5 |
| STY011 | Ver perfil | 2 |
| STY012 | Avaliar usuário | 6 |
| STY013 | Montador de setup | 4 |
| STY014 | Cálculo de setup | 3 |
| STY015 | Tendências de setup | 1 |
| STY016 | Publicar oferta | 6 |
| STY017 | Scanner IA | 4 |
| STY018 | Impulsão de oferta (pago / ONG) | 4 |
| STY019 | Alterar status do anúncio (pausar / reabrir) | 6 |
| STY020 | Buscar e filtrar ofertas | 3 |
| STY021 | Enviar mensagem | 5 |
| STY022 | Configurar mensagem automática de vendedor | 3 |
| STY023 | Deleção de mensagem (usuário) | 4 |
| STY024 | Encerramento de chat (usuário) | 3 |
| STY025 | Agendar horário | 5 |
| STY026 | Cancelar agendamento | 5 |
| STY027 | Geração de QR Code | 3 |
| STY028 | Escanear QR Code | 4 |
| STY029 | Gerar e consultar rota | 4 |
| STY030 | Laudo técnico | 5 |
| STY031 | Solicitar devolução | 5 |
| STY032 | Geração de PDF (comprovante) | 3 |
| STY033 | Abrir reclamação | 4 |
| STY034 | Requisitar escalamento de reclamação | 4 |
| STY035 | Encerrar reclamação | 4 |
| STY036 | Criação de leilão (admin) | 4 |
| STY037 | Participar em leilão | 4 |
| STY038 | Proposta (lote) | 6 |
| STY039 | Requisitar cadastro (ONG) | 4 |
| STY040 | Verificação de ONG (admin) | 4 |
| STY041 | Publicação de pedido de doações (ONG) | 4 |
| STY042 | Verificar moedas (cashback) | 3 |
| STY043 | Resgatar moedas | 4 |
| STY044 | Gastar moedas | 3 |
| STY045 | Manter método de pagamento | 5 |
| STY046 | Hardware Captcha | 5 |
| STY047 | Recolhimento de dados para treino de IA (admin) | 4 |
| STY048 | Atualização da IA (admin) | 4 |
| STY049 | Realizar denúncia | 4 |
| STY050 | Analisar e finalizar denúncia | 7 |
| STY051 | Remoção de post (moderação / admin) | 4 |
| STY052 | Censura de dados pessoais em descrições de produtos (moderação) | 5 |
| STY053 | Geração de relatório (admin – DaaS) | 3 |
| STY054 | Gerar métricas ESG (usuário / site-wide) | 6 |
| STY055 | Descrição de item (site-wide – falha de mortalidade / defeitos crônicos) | 3 |
| STY056 | Checamento de logs (admin) | 4 |
| STY057 | Consultar guia informativo | 3 |
| STY058 | Sugestão de ecoponto oficial (reciclagem) | 4 |
| Total |  | 250 |
