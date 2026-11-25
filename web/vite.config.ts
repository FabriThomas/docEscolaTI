import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const caminho = (p: string) => fileURLToPath(new URL(p, import.meta.url))

/** Segredo de teste do backend local (backend/.env.example). Nunca use um segredo real aqui. */
const SEGREDO_TESTE_BACKEND = 'troque-por-um-segredo-de-teste'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const hibrido = mode === 'hibrido'
  // "npm run dev:hibrido": /api vai para o FastAPI local (rotas prontas) e o resto é simulado.
  const proxy = env.VITE_API_PROXY || (hibrido ? 'http://127.0.0.1:8000' : '')

  const define: Record<string, string> = {}
  // "npm run build:demo": build de produção com tudo simulado (Lighthouse, E2E e apresentação).
  if (mode === 'demo') define['import.meta.env.VITE_API_MOCK'] = JSON.stringify('tudo')
  if (hibrido) {
    define['import.meta.env.VITE_API_MOCK'] = JSON.stringify('parcial')
    define['import.meta.env.VITE_API_PROXY'] = JSON.stringify(proxy)
    define['import.meta.env.VITE_DEV_JWT_SECRET'] = JSON.stringify(env.VITE_DEV_JWT_SECRET || SEGREDO_TESTE_BACKEND)
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': caminho('./src'),
        // Pacotes compartilhados com o app (ADR-19 e EDTS-379). O zod vem sempre da cópia do web (dedupe).
        '@steely/schemas': caminho('../packages/schemas/src/index.ts'),
      },
      dedupe: ['zod', 'react', 'react-dom'],
    },
    define,
    server: {
      fs: { allow: [caminho('.'), caminho('../packages')] },
      proxy: proxy ? { '/api': { target: proxy, changeOrigin: true } } : undefined,
    },
  }
})
