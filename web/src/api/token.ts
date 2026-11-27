/**
 * Token de acesso (JWT) guardado só em memória (ADR-18: nada de token em storage persistido).
 * Ao recarregar a página, a sessão é restaurada por POST /auth/refresh, que usa o cookie
 * HttpOnly de renovação definido pelo FastAPI.
 */
let accessToken: string | null = null

export const tokenDeAcesso = {
  obter: () => accessToken,
  definir: (token: string) => {
    accessToken = token
  },
  limpar: () => {
    accessToken = null
  },
}
