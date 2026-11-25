import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renovarSessao } from '@/api/auth'
import { ApiError, configurarSessao } from '@/api/http'
import { queryKeys } from '@/api/queryKeys'
import { tokenDeAcesso } from '@/api/token'

/** Cliente de cache (ADR-18): staleTime de 30 s e sem retry em erros 4xx. */
export function criarQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (falhas, erro) => !(erro instanceof ApiError && erro.status >= 400 && erro.status < 500) && falhas < 2,
      },
      mutations: { retry: false },
    },
  })
}

export function Provedores({ children, queryClient }: { children: ReactNode; queryClient?: QueryClient }) {
  const [cliente] = useState(() => {
    const qc = queryClient ?? criarQueryClient()
    // Token vencido: tenta renovar uma vez; se não der, encerra a sessão local.
    configurarSessao({
      renovar: async () => {
        const usuario = await renovarSessao()
        qc.setQueryData(queryKeys.sessao, usuario)
        return Boolean(usuario)
      },
      expirar: () => {
        tokenDeAcesso.limpar()
        qc.setQueryData(queryKeys.sessao, null)
      },
    })
    return qc
  })

  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
}
