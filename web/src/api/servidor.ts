import { useQuery } from '@tanstack/react-query'
import { cliente, resultado } from './cliente'
import { SEM_RENOVACAO } from './http'
import { queryKeys } from './queryKeys'

/** Rotas que o FastAPI já tem (EDTS-374): /health e /me. */

/** Situação da API e dos bancos (ADR-13), conferida a cada minuto. */
export function useSaudeApi(ativo = true) {
  return useQuery({
    enabled: ativo,
    queryKey: queryKeys.servidor.saude,
    queryFn: ({ signal }) => resultado(cliente.GET('/api/v1/health', { signal })),
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: false,
  })
}

/** Confere no servidor se o token é aceito (GET /me). Não tenta renovar: é usado durante a renovação. */
export function confirmarTokenNoServidor() {
  return resultado(cliente.GET('/api/v1/me', { headers: { [SEM_RENOVACAO]: '1' } }))
}
