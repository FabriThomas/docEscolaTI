import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  codigosRecuperacaoSchema,
  configurar2faSchema,
  exclusaoAgendadaSchema,
  perfilSchema,
  segurancaSchema,
  type EditarPerfilInput,
  type Perfil,
  type UsuarioSessao,
} from '@steely/schemas'
import { encerrarSessaoLocal } from './auth'
import { api } from './http'
import { queryKeys } from './queryKeys'

/** Perfil, segurança e exclusão da conta logada (STY007 a STY011). Rotas sob /api/v1/me. */

export function usePerfil() {
  return useQuery({ queryKey: queryKeys.conta.perfil, queryFn: () => api('/me/profile', perfilSchema) })
}

function atualizarCachePerfil(queryClient: ReturnType<typeof useQueryClient>, perfil: Perfil) {
  queryClient.setQueryData(queryKeys.conta.perfil, perfil)
  queryClient.setQueryData<UsuarioSessao | null>(queryKeys.sessao, (atual) =>
    atual ? { ...atual, displayName: perfil.displayName, avatarUrl: perfil.avatarUrl } : atual,
  )
}

export function useEditarPerfil() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dados: EditarPerfilInput) => api('/me/profile', perfilSchema, { method: 'PATCH', body: dados }),
    onSuccess: (perfil) => atualizarCachePerfil(queryClient, perfil),
  })
}

export function useEnviarFoto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (arquivo: File) => {
      const corpo = new FormData()
      corpo.append('file', arquivo)
      return api('/me/avatar', perfilSchema, { method: 'POST', body: corpo })
    },
    onSuccess: (perfil) => atualizarCachePerfil(queryClient, perfil),
  })
}

export function useSeguranca() {
  return useQuery({ queryKey: queryKeys.conta.seguranca, queryFn: () => api('/me/security', segurancaSchema) })
}

function useInvalidarConta() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.conta.todas })
}

/** Alterar senha (STY008): a API encerra as demais sessões e avisa por e-mail. */
export function useTrocarSenha() {
  const invalidar = useInvalidarConta()
  return useMutation({
    mutationFn: (dados: { currentPassword: string; newPassword: string }) =>
      api('/me/password', null, { method: 'PUT', body: dados }),
    onSuccess: invalidar,
  })
}

export function useIniciar2fa() {
  return useMutation({
    mutationFn: () => api('/me/2fa/setup', configurar2faSchema, { method: 'POST', body: { method: 'APP' } }),
  })
}

export function useConfirmar2fa() {
  const invalidar = useInvalidarConta()
  return useMutation({
    mutationFn: (dados: { code: string }) => api('/me/2fa/enable', codigosRecuperacaoSchema, { method: 'POST', body: dados }),
    onSuccess: invalidar,
  })
}

export function useDesativar2fa() {
  const invalidar = useInvalidarConta()
  return useMutation({
    mutationFn: (dados: { password: string; code: string }) => api('/me/2fa/disable', null, { method: 'POST', body: dados }),
    onSuccess: invalidar,
  })
}

export function useGerarCodigosRecuperacao() {
  return useMutation({
    mutationFn: () => api('/me/2fa/recovery-codes', codigosRecuperacaoSchema, { method: 'POST' }),
  })
}

export function useEncerrarSessao() {
  const invalidar = useInvalidarConta()
  return useMutation({
    mutationFn: (id: string) => api(`/me/sessions/${encodeURIComponent(id)}`, null, { method: 'DELETE' }),
    onSuccess: invalidar,
  })
}

/**
 * Sair de todos os aparelhos, inclusive este (STY009, fluxo alternativo 1).
 * Depois do sucesso, quem chama navega e então chama `encerrarSessaoLocal` (ver useSair).
 */
export function useSairDeTodos() {
  return useMutation({ mutationFn: () => api('/me/sessions', null, { method: 'DELETE' }) })
}

/**
 * Pedido de exclusão (STY010, ADR-07): conta entra em carência de 30 dias e as sessões são revogadas.
 * Depois do sucesso, quem chama navega e então chama `encerrarSessaoLocal`.
 */
export function useSolicitarExclusao() {
  return useMutation({
    mutationFn: (dados: { password: string; confirmation: string }) =>
      api('/me/deletion', exclusaoAgendadaSchema, { method: 'POST', body: dados }),
  })
}

/** Limpa a sessão local (token e cache) sem precisar importar o QueryClient na tela. */
export function useEncerrarSessaoLocal() {
  const queryClient = useQueryClient()
  return () => encerrarSessaoLocal(queryClient)
}
