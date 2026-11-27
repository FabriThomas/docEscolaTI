import createClient from 'openapi-fetch'
import { problemaSchema } from '@steely/schemas'
import { API_ORIGEM, ApiError, fetchAutenticado, lerRetryAfter } from './http'
import type { paths } from './schema'

/**
 * Cliente tipado gerado do contrato do FastAPI (ADR-13 e ADR-18): openapi-typescript + openapi-fetch.
 * Rotas novas aparecem aqui ao rodar `npm run api:types` depois que o backend atualizar o snapshot.
 */
export const cliente = createClient<paths>({ baseUrl: API_ORIGEM, fetch: fetchAutenticado, credentials: 'include' })

/** Devolve os dados ou lança ApiError (Problem Details, RFC 9457). */
export async function resultado<T>(chamada: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  const { data, error, response } = await chamada
  if (!response.ok || error !== undefined) {
    const lido = problemaSchema.safeParse(error)
    throw new ApiError(
      response.status,
      lido.success ? lido.data : { status: response.status, title: response.statusText },
      lerRetryAfter(response.headers.get('Retry-After')),
    )
  }
  return data as T
}
