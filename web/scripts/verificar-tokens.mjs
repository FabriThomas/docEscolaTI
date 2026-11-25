// Garante o uso só dos tokens do Design System em src/ (ADR-19):
// - nenhuma cor hex (#123456) fora de packages/tokens;
// - nenhum valor arbitrário do Tailwind com px ou cor (ex.: p-[13px], bg-[#fff]);
// - nenhum style={{...}} inline, exceto valores dinâmicos marcados com "tokens-ok".
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const raiz = new URL('../src/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const regras = [
  { nome: 'cor hex', padrao: /#[0-9a-fA-F]{3,8}\b/ },
  { nome: 'valor arbitrário com px ou cor', padrao: /-\[[^\]]*(?:\d+px|#[0-9a-fA-F]{3,8})[^\]]*\]/ },
  { nome: 'style inline', padrao: /style=\{\{/ },
]

function arquivos(dir) {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return nome === 'assets' || nome === 'mocks' || nome === 'test' ? [] : arquivos(caminho)
    return /\.(tsx?|css)$/.test(nome) && !/\.test\.tsx?$/.test(nome) ? [caminho] : []
  })
}

const problemas = []
for (const arquivo of arquivos(raiz)) {
  const linhas = readFileSync(arquivo, 'utf8').split('\n')
  linhas.forEach((linha, i) => {
      // O marcador vale para a própria linha ou para a linha seguinte (comentário acima).
      if (linha.includes('tokens-ok') || linhas[i - 1]?.includes('tokens-ok')) return
      for (const regra of regras) {
        if (regra.padrao.test(linha)) problemas.push(`${relative(raiz, arquivo)}:${i + 1}  ${regra.nome}: ${linha.trim()}`)
      }
    })
}

if (problemas.length) {
  console.error(`❌ ${problemas.length} uso(s) fora dos tokens do Design System:\n` + problemas.join('\n'))
  process.exit(1)
}
console.log('✅ Só tokens do Design System em src/.')
