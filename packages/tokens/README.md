# Tokens do Design System

[← Início](../../README.md)

Fonte única de cores, tamanhos, raios e tipografia do Steely para web e app ([ADR-19](../../02-adrs/md/ADR-19_Validacao_e_Schemas_Compartilhados.md)).

- [tokens.json](tokens.json) — tokens no formato W3C DTCG, em três níveis: primitivo, semântico e componente.
- `build/tokens.css` — variáveis CSS (`--st-*`, tamanhos em rem) usadas pelo web.
- `build/tokens.ts` — objeto tipado (tamanhos em pontos) para o app Expo.
- [scripts/contraste.mjs](scripts/contraste.mjs) — reprova pares texto/fundo abaixo do WCAG AA.

```bash
cd packages/tokens
npm install
npm run build
```

O `build/` é gerado pelo Style Dictionary e fica versionado; não edite à mão. Quando as Variables do Figma forem exportadas, substitua o `tokens.json` pela exportação.
