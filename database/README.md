# Banco de dados

[← Início](../README.md)

Scripts SQL do banco do Steely.

| | |
|---|---|
| **Tecnologia** | PostgreSQL 15+ gerenciado pelo Supabase |
| **Projetos** | 2 projetos separados: **Core** (operação) e **DaaS** (dados analíticos anonimizados) |
| **Extensões** | PostGIS (raio geográfico), pg_trgm (busca textual), pg_cron + pg_net (rotinas agendadas), RLS (segurança por linha) |

No celular, o cache offline usa SQLite (WatermelonDB) — ver [mobile/](../mobile/).

## Decisões que se aplicam aqui

| ADR | Assunto |
|---|---|
| [ADR-08](../02-adrs/md/ADR-08_Banco_Principal.md) | Banco principal |
| [ADR-09](../02-adrs/md/ADR-09_Onde_Fica_a_Autorizacao.md) | Autorização no banco (RLS e funções) |
| [ADR-10](../02-adrs/md/ADR-10_Ledger_de_Moedas.md) | Ledger de moedas |
| [ADR-11](../02-adrs/md/ADR-11_Armazenamento_de_Imagens.md) | Armazenamento de imagens (Supabase Storage) |
| [ADR-04](../02-adrs/md/ADR-04_Anonimizacao_e_Agregacao_do_DaaS.md) | k-anonimato no DaaS |
| [ADR-05](../02-adrs/md/ADR-05_Trilha_de_Auditoria_Imutavel.md) | Retenção e imutabilidade dos logs |

## Modelo de dados

O DER do modelo atual (66 tabelas) está em [DER_Modelo_de_Dados.md](../01-planejamento/DER_Modelo_de_Dados.md). A versão de junho/2026, do produto anterior, está em [docs/historico/diagramas](../docs/historico/diagramas/).

## Código

*Ainda não adicionado a este repositório.*
