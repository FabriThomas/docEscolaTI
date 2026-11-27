import { getResponse } from 'msw'
import { mocksParciais, ROTAS_DO_BACKEND } from './demo'
import { handlers } from './handlers'

/** No modo parcial, as rotas que o FastAPI já implementa seguem para o servidor real. */
export function deveSimular(caminho: string): boolean {
  if (!caminho.startsWith('/api/v1/')) return false
  return !(mocksParciais && ROTAS_DO_BACKEND.some((rota) => rota.test(caminho)))
}

const urlDe = (entrada: RequestInfo | URL) =>
  new URL(entrada instanceof Request ? entrada.url : String(entrada), window.location.origin)

/**
 * Liga a API simulada interceptando o fetch da própria página, sem service worker.
 * Funciona em qualquer navegador (inclusive onde o registro de service worker é bloqueado).
 * A URL é lida sem criar outra Request: isso consumiria o corpo da original (POST com JSON).
 */
export function ligarMocks() {
  const fetchOriginal = window.fetch.bind(window)
  window.fetch = async (entrada: RequestInfo | URL, init?: RequestInit) => {
    if (deveSimular(urlDe(entrada).pathname)) {
      const resposta = await getResponse(handlers, new Request(entrada, init))
      if (resposta) return resposta
    }
    return fetchOriginal(entrada, init)
  }
}
