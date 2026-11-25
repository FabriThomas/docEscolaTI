// Verifica o contraste WCAG 2.1 dos pares texto/fundo definidos em tokens.json (ADR-19 e ADR-20).
// Falha (exit 1) se algum par ficar abaixo do mínimo. Cores com transparência são compostas
// sobre o fundo indicado em "on" (ou sobre o próprio fundo, se opaco).
import { readFileSync } from 'node:fs'

const resolvidos = JSON.parse(readFileSync(new URL('../build/tokens.json', import.meta.url), 'utf8'))
const pares = resolvidos['contrast-pairs.pairs']

function rgba(hex) {
  const h = String(hex).replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
  return { r, g, b, a }
}

function compor(frente, fundo) {
  return {
    r: frente.r * frente.a + fundo.r * (1 - frente.a),
    g: frente.g * frente.a + fundo.g * (1 - frente.a),
    b: frente.b * frente.a + fundo.b * (1 - frente.a),
    a: 1,
  }
}

function luminancia({ r, g, b }) {
  const canal = (c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
}

function cor(caminho) {
  const valor = resolvidos[caminho]
  if (!valor) throw new Error(`Token não encontrado: ${caminho}`)
  return rgba(valor)
}

let falhas = 0
for (const par of pares) {
  let fundo = cor(par.bg)
  if (fundo.a < 1) fundo = compor(fundo, cor(par.on ?? 'semantic.color.bg.app'))
  const frente = compor(cor(par.fg), fundo)
  const [l1, l2] = [luminancia(frente), luminancia(fundo)].sort((a, b) => b - a)
  const razao = (l1 + 0.05) / (l2 + 0.05)
  const ok = razao >= par.min
  if (!ok) falhas++
  const nome = (c) => c.replace('semantic.color.', '')
  console.log(`${ok ? '✅' : '❌'} ${razao.toFixed(2)}:1 (mín. ${par.min}) ${nome(par.fg)} sobre ${nome(par.bg)}${par.on ? ` em ${nome(par.on)}` : ''}`)
}

if (falhas) {
  console.error(`\n${falhas} par(es) abaixo do contraste mínimo.`)
  process.exit(1)
}
console.log(`\n${pares.length} pares aprovados.`)
