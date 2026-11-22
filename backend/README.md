# Back-end — API

[← Início](../README.md)

API REST que concentra as regras de negócio do Steely. Toda escrita e toda leitura protegida passam por ela; os apps só falam direto com o Supabase para o Realtime.

| | |
|---|---|
| **Tecnologia** | Python · FastAPI · Pydantic v2 |
| **Hospedagem** | Render |
| **Banco** | PostgreSQL no Supabase — ver [database/](../database/) |

## Decisões que se aplicam aqui

| ADR | Assunto |
|---|---|
| [ADR-09](../02-adrs/md/ADR-09_Onde_Fica_a_Autorizacao.md) | Autorização em duas camadas (FastAPI + PostgreSQL) |
| [ADR-13](../02-adrs/md/ADR-13_Contrato_e_Versionamento_da_API.md) | Contrato OpenAPI, versionamento `/api/v1` e formato de erro |
| [ADR-14](../02-adrs/md/ADR-14_Idempotencia.md) | Idempotência com `Idempotency-Key` |
| [ADR-15](../02-adrs/md/ADR-15_Concorrencia_dos_Lances.md) | Concorrência dos lances nos leilões |
| [ADR-16](../02-adrs/md/ADR-16_Tarefas_Agendadas.md) | Tarefas agendadas (`pg_cron`) |
| [ADR-17](../02-adrs/md/ADR-17_Estrategia_de_Testes.md) | Estratégia de testes |
| [ADR-02](../02-adrs/md/ADR-02_Censura_de_Dados_Pessoais_e_Contatos.md) | Censura de dados pessoais no chat |
| [ADR-03](../02-adrs/md/ADR-03_Escrow_Simulado.md) | Escrow e retenção de 7 dias |

## Código

*Ainda não adicionado a este repositório.*
