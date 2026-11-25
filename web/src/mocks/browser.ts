import { getResponse } from 'msw'
import { mocksParciais, ROTAS_DO_BACKEND } from './demo'
import { handlers } from './handlers'

/** No modo parcial, as rotas que o FastAPI já implementa seguem para o servidor real. */
export function deveSimular(caminho: string): boolean {
  if (!caminho.startsWith('/api/v1/')) return false
  return !(mocksParciais && ROTAS_DO_BACKEND.includes(caminho))
}

/**
 * Liga a API simulada interceptando o fetch da própria página, sem service worker.
 * Funciona em qualquer navegador (inclusive onde o registro de service worker é bloqueado).
 */
export function ligarMocks() {
  const fetchOriginal = window.fetch.bind(window)
  window.fetch = async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const requisicao = new Request(entrada, init)
    if (deveSimular(new URL(requisicao.url).pathname)) {
      const resposta = await getResponse(handlers, requisicao)
      if (resposta) return resposta
    }
    return fetchOriginal(entrada, init)
  }
}
