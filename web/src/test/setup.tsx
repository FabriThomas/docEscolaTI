import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'
import { reiniciarDb } from '@/mocks/db'
import { server } from '@/mocks/server'
import { tokenDeAcesso } from '@/api/token'
import { useAvisos } from '@/stores/avisos'

// Layouts e telas são carregados sob demanda: a primeira carga de cada arquivo leva mais que 1 s.
configure({ asyncUtilTimeout: 5000 })

// O jsdom troca o AbortSignal global, que o fetch do Node não aceita. Nos testes, o tempo
// limite da requisição não importa: o sinal é descartado.
const fetchOriginal = globalThis.fetch
globalThis.fetch = (entrada: RequestInfo | URL, init?: RequestInit) => fetchOriginal(entrada, { ...init, signal: undefined })

// O Turnstile depende de script externo; nos testes, um botão simula a verificação.
vi.mock('@/features/auth/Captcha', () => ({
  Captcha: ({ aoObterToken }: { aoObterToken: (token: string | null) => void }) => (
    <button type="button" onClick={() => aoObterToken('token-de-teste')}>
      Simular verificação
    </button>
  ),
}))

// Radix e o jsdom: APIs de layout que não existem no ambiente de teste.
Element.prototype.scrollIntoView ??= () => {}
window.scrollTo = () => {}
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => {
  reiniciarDb()
  tokenDeAcesso.limpar()
  useAvisos.setState({ avisos: [] })
})
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())
