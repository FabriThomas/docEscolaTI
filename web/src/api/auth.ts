import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
  codigoEnviadoSchema,
  respostaLoginSchema,
  sessaoSchema,
  type CadastroPayload,
  type LoginPayload,
  type Sessao,
  type UsuarioSessao,
} from '@steely/schemas'
import { api, ApiError } from './http'
import { queryKeys } from './queryKeys'
import { confirmarTokenNoServidor } from './servidor'
import { tokenDeAcesso } from './token'

/**
 * Autenticação pelo FastAPI (ADR-09, ADR-13 e ADR-21). Rotas sob /api/v1/auth.
 * O captcha vai no cabeçalho X-Turnstile-Token quando a rota exige.
 */

export function concluirLogin(queryClient: QueryClient, sessao: Sessao): UsuarioSessao {
  tokenDeAcesso.definir(sessao.accessToken)
  queryClient.setQueryData(queryKeys.sessao, sessao.user)
  return sessao.user
}

/** Limpa token e todo o cache (STY009 passo 4). */
export function encerrarSessaoLocal(queryClient: QueryClient) {
  tokenDeAcesso.limpar()
  queryClient.removeQueries({ queryKey: queryKeys.conta.todas })
  queryClient.setQueryData(queryKeys.sessao, null)
}

/** Restaura a sessão a partir do cookie de renovação. Retorna null se não houver sessão. */
export async function renovarSessao(): Promise<UsuarioSessao | null> {
  try {
    const sessao = await api('/auth/refresh', sessaoSchema, { method: 'POST', autenticada: false })
    tokenDeAcesso.definir(sessao.accessToken)
    // O FastAPI confirma o token (GET /me). 401 = token recusado; outros erros não derrubam a sessão.
    try {
      await confirmarTokenNoServidor()
    } catch (erro) {
      if (erro instanceof ApiError && erro.status === 401) throw erro
    }
    return sessao.user
  } catch {
    tokenDeAcesso.limpar()
    return null
  }
}

/** Usuário logado (ou null). Carregado uma vez ao abrir o site. */
export function useSessao() {
  return useQuery({
    queryKey: queryKeys.sessao,
    queryFn: renovarSessao,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  })
}

type ComCaptcha<T> = T & { captchaToken?: string | null }

export function useEntrar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ captchaToken, ...dados }: ComCaptcha<LoginPayload>) =>
      api('/auth/login', respostaLoginSchema, { method: 'POST', body: dados, captchaToken, autenticada: false }),
    onSuccess: (resposta) => {
      if (resposta.status === 'AUTHENTICATED') concluirLogin(queryClient, resposta)
    },
  })
}

export function useConfirmarSegundoFator() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dados: { challengeId: string; code: string }) =>
      api('/auth/login/2fa', sessaoSchema, { method: 'POST', body: dados, autenticada: false }),
    onSuccess: (sessao) => concluirLogin(queryClient, sessao),
  })
}

export function useCadastrar() {
  return useMutation({
    mutationFn: ({ captchaToken, passwordConfirmation: _confirmacao, ...dados }: ComCaptcha<CadastroPayload>) =>
      api('/auth/signup', codigoEnviadoSchema, { method: 'POST', body: dados, captchaToken, autenticada: false }),
  })
}

export function useVerificarEmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dados: { email: string; code: string }) =>
      api('/auth/verify-email', sessaoSchema, { method: 'POST', body: dados, autenticada: false }),
    onSuccess: (sessao) => concluirLogin(queryClient, sessao),
  })
}

export function useReenviarCodigoEmail() {
  return useMutation({
    mutationFn: (dados: { email: string }) =>
      api('/auth/verify-email/resend', codigoEnviadoSchema, { method: 'POST', body: dados, autenticada: false }),
  })
}

export function useRecuperarSenha() {
  return useMutation({
    mutationFn: ({ captchaToken, ...dados }: ComCaptcha<{ email: string }>) =>
      api('/auth/recover', null, { method: 'POST', body: dados, captchaToken, autenticada: false }),
  })
}

export function useRedefinirSenha() {
  return useMutation({
    mutationFn: (dados: { token: string; password: string }) =>
      api('/auth/reset-password', null, { method: 'POST', body: dados, autenticada: false }),
  })
}

export function useSolicitarCodigo() {
  return useMutation({
    mutationFn: ({ captchaToken, ...dados }: ComCaptcha<{ email: string }>) =>
      api('/auth/otp', codigoEnviadoSchema, { method: 'POST', body: dados, captchaToken, autenticada: false }),
  })
}

export function useEntrarComCodigo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dados: { email: string; code: string }) =>
      api('/auth/otp/verify', respostaLoginSchema, { method: 'POST', body: dados, autenticada: false }),
    onSuccess: (resposta) => {
      if (resposta.status === 'AUTHENTICATED') concluirLogin(queryClient, resposta)
    },
  })
}

/** Cancela a exclusão durante a carência de 30 dias e entra (STY010, fluxo alternativo 3; ADR-07). */
export function useReativarConta() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dados: LoginPayload) => api('/auth/reactivate', sessaoSchema, { method: 'POST', body: dados, autenticada: false }),
    onSuccess: (sessao) => concluirLogin(queryClient, sessao),
  })
}

/**
 * Sair (STY009). Quem chama navega para a página pública e depois chama `encerrarSessaoLocal`,
 * mesmo se a API falhar (sessão já expirada, fluxo alternativo 2). Limpar antes de navegar faria a
 * rota protegida mandar para o login em vez da página inicial (passo 5).
 */
export function useSair() {
  return useMutation({ mutationFn: () => api('/auth/logout', null, { method: 'POST' }) })
}
