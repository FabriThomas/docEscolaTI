# Mobile — App Android

[← Início](../README.md)

Aplicativo Android do Steely: anunciar com o Scanner IA, negociar pelo chat, ir até o ponto de encontro e confirmar a entrega com QR Code, mesmo sem internet.

| | |
|---|---|
| **Tecnologia** | Expo (React Native) |
| **Offline** | WatermelonDB, com sincronização em segundo plano |
| **Mapas** | Google Routes API |

## Decisões que se aplicam aqui

| ADR | Assunto |
|---|---|
| [ADR-23](../02-adrs/md/ADR-23_Offline_First.md) | Offline-first |
| [ADR-24](../02-adrs/md/ADR-24_Armazenamento_Seguro_no_Dispositivo.md) | Armazenamento seguro de chaves e tokens |
| [ADR-25](../02-adrs/md/ADR-25_Notificacoes_Push.md) | Notificações push |
| [ADR-26](../02-adrs/md/ADR-26_Provedor_de_Mapas_e_Rotas.md) | Provedor de mapas e rotas |
| [ADR-27](../02-adrs/md/ADR-27_Captura_e_Compressao_de_Imagem.md) | Captura e compressão de imagem (WebP) |
| [ADR-19](../02-adrs/md/ADR-19_Validacao_e_Schemas_Compartilhados.md) | Design system compartilhado com a web |

Telas de referência: [docs/05-design/prototipos](../docs/05-design/prototipos/).

## Código

| Pasta | O que tem |
|---|---|
| `app/anunciar` | Criar anúncio em 4 etapas (protótipos 002 a 006): fotos, câmera, detalhes, preço e revisão. |
| `app/anuncios` | Meus anúncios, pausar, reabrir, excluir e editar (007 a 010). |
| `src` | Cores, chamada à API, fotos (validação e compressão WebP), rascunho do anúncio e mock da API. |
| `__tests__` | Testes com Jest e Testing Library. |

### Como rodar

```bash
cd mobile
npm install
cp .env.example .env
npx expo start
```

Testes:

```bash
npm test
npx tsc --noEmit
```

Sem backend, o app usa o mock (`EXPO_PUBLIC_USAR_MOCK=sim`). As decisões e o que ainda falta combinar estão em [DECISOES-EDTS-381.md](DECISOES-EDTS-381.md).
