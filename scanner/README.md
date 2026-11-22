# Scanner IA

[← Início](../README.md)

Serviço de visão computacional que identifica o hardware pelas fotos do anúncio e gera o laudo técnico automático.

<img src="assets/exemplo-auto-anotacao-vlm.jpg" width="420" alt="Placa-mãe com componentes detectados e rotulados automaticamente">

*Exemplo da auto-anotação usada para montar o dataset de treino.*

## Como funciona

1. **Detecção** — localiza os componentes na foto (detector YOLO11s).
2. **Classificação hierárquica** — do geral ao específico (níveis L0 a L4: categoria, linha, série...).
3. **Identificação do modelo exato** — busca vetorial com FAISS (nível L5), para distinguir placas visualmente "gêmeas".
4. **Leitura da etiqueta** — OCR (PaddleOCR).
5. **Decisão por confiança** ([ADR-12](../02-adrs/md/ADR-12_Limiar_de_Confianca_do_Scanner.md)):

| Confiança | O que acontece |
|---|---|
| ≥ 80% | Anúncio preenchido automaticamente |
| 50% – 79% | O vendedor escolhe entre as 3 hipóteses mais prováveis |
| < 50% ou falha | Preenchimento manual, e a foto vai para curadoria |

Os modelos rodam em **ONNX** num serviço separado da API, e a resposta precisa sair em até 4 segundos (`RNF-05`). Se o serviço falhar, um *circuit breaker* leva o vendedor direto ao preenchimento manual.

## Decisões que se aplicam aqui

| ADR | Assunto |
|---|---|
| [ADR-01](../02-adrs/md/ADR-01_Motor_do_Scanner_IA.md) | Arquitetura e motor de visão computacional |
| [ADR-12](../02-adrs/md/ADR-12_Limiar_de_Confianca_do_Scanner.md) | Limiar de confiança |
| [ADR-11](../02-adrs/md/ADR-11_Armazenamento_de_Imagens.md) | Armazenamento de imagens (sem EXIF/GPS) |
| [ADR-27](../02-adrs/md/ADR-27_Captura_e_Compressao_de_Imagem.md) | Captura e compressão no celular |

## Código

*Ainda não adicionado a este repositório.*
