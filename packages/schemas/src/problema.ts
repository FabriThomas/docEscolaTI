import { z } from 'zod'

/**
 * Erro padrão da API (RFC 9457, application/problem+json), com os campos extras do ADR-13:
 * code (estável), correlationId (RNF-11) e errors[] (validação por campo).
 */
export const problemaSchema = z.looseObject({
  type: z.string().optional(),
  title: z.string().optional(),
  status: z.number().optional(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  code: z.string().optional(),
  correlationId: z.string().optional(),
  errors: z
    .array(
      z.looseObject({
        field: z.string().optional(),
        pointer: z.string().optional(),
        message: z.string(),
        code: z.string().optional(),
      }),
    )
    .optional(),
})

export type Problema = z.infer<typeof problemaSchema>

/** Códigos estáveis usados pelas telas desta entrega (ADR-13, ADR-21). */
export const CODIGOS_ERRO = {
  captchaObrigatorio: 'CAPTCHA_REQUIRED',
  loginBloqueado: 'LOGIN_LOCKED',
  limiteTaxa: 'RATE_LIMITED',
  credenciaisInvalidas: 'INVALID_CREDENTIALS',
  contaNaoVerificada: 'ACCOUNT_NOT_VERIFIED',
  contaSuspensa: 'ACCOUNT_SUSPENDED',
  contaEmCarencia: 'ACCOUNT_IN_GRACE_PERIOD',
  emailOuCpfEmUso: 'EMAIL_OR_CPF_IN_USE',
  codigoInvalido: 'CODE_INVALID',
  codigoExpirado: 'CODE_EXPIRED',
  linkInvalido: 'LINK_INVALID',
  senhaAtualIncorreta: 'CURRENT_PASSWORD_INVALID',
  senhaRepetida: 'PASSWORD_REUSED',
  exclusaoBloqueada: 'DELETION_BLOCKED',
} as const
