// Gera as saídas do Design System a partir de tokens.json (ADR-19).
// web: build/tokens.css (variáveis CSS, tamanhos em rem)
// app: build/tokens.ts (objeto tipado, tamanhos em pontos)
// verificação: build/tokens.json (valores resolvidos, usado pelo script de contraste)
import StyleDictionary from 'style-dictionary'

const PREFIXO = 'st'
const BASE_REM = 16

/** "#RRGGBBAA" → "rgba(r, g, b, a)"; "#RRGGBB" fica como está. */
function corCss(valor) {
  const hex = String(valor).replace('#', '')
  if (hex.length !== 8) return String(valor).toUpperCase()
  const [r, g, b, a] = [0, 2, 4, 6].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return `rgba(${r}, ${g}, ${b}, ${Math.round((a / 255) * 100) / 100})`
}

const ehDimensao = (token) => token.$type === 'dimension'
const px = (valor) => Number.parseFloat(String(valor))

function nomeCss(token) {
  // primitive.color.navy.900 → st-navy-900 ; semantic.color.text.muted → st-text-muted
  const caminho = token.path.filter((p) => !['primitive', 'semantic', 'component', 'color'].includes(p))
  return `--${PREFIXO}-${caminho.join('-')}`
}

function valorCss(token) {
  if (token.$type === 'color') return corCss(token.$value)
  if (ehDimensao(token)) {
    const n = px(token.$value)
    if (token.path.includes('radius') && n >= 999) return '9999px'
    return n === 0 ? '0' : `${n / BASE_REM}rem`
  }
  return String(token.$value)
}

StyleDictionary.registerFormat({
  name: 'steely/css',
  format: ({ dictionary }) => {
    const linhas = dictionary.allTokens
      .filter((t) => t.$type !== 'other')
      .map((t) => `  ${nomeCss(t)}: ${valorCss(t)};`)
    return `/* Gerado por packages/tokens/sd.config.mjs a partir de tokens.json. Não edite à mão. */\n:root {\n${linhas.join('\n')}\n}\n`
  },
})

StyleDictionary.registerFormat({
  name: 'steely/ts',
  format: ({ dictionary }) => {
    const raiz = {}
    for (const t of dictionary.allTokens.filter((tk) => tk.$type !== 'other')) {
      let no = raiz
      t.path.slice(0, -1).forEach((p) => (no = no[p] ??= {}))
      const valor = t.$type === 'color' ? corCss(t.$value) : ehDimensao(t) ? px(t.$value) : t.$value
      no[t.path.at(-1)] = valor
    }
    return `// Gerado por packages/tokens/sd.config.mjs a partir de tokens.json. Não edite à mão.\n// Tamanhos em pontos (React Native/Expo); cores em hex ou rgba.\nexport const tokens = ${JSON.stringify(raiz, null, 2)} as const\n\nexport type SteelyTokens = typeof tokens\n`
  },
})

StyleDictionary.registerFormat({
  name: 'steely/json',
  format: ({ dictionary }) => {
    const plano = Object.fromEntries(dictionary.allTokens.map((t) => [t.path.join('.'), t.$value]))
    return JSON.stringify(plano, null, 2) + '\n'
  },
})

const sd = new StyleDictionary({
  source: ['tokens.json'],
  usesDtcg: true,
  log: { verbosity: 'default', warnings: 'error' },
  platforms: {
    web: { transforms: ['name/kebab'], buildPath: 'build/', files: [{ destination: 'tokens.css', format: 'steely/css' }] },
    app: { transforms: ['name/kebab'], buildPath: 'build/', files: [{ destination: 'tokens.ts', format: 'steely/ts' }] },
    verificacao: { transforms: ['name/kebab'], buildPath: 'build/', files: [{ destination: 'tokens.json', format: 'steely/json' }] },
  },
})

await sd.buildAllPlatforms()
