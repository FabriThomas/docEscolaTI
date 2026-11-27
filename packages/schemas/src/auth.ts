import { z } from 'zod'
import {
  MSG,
  apenasDigitos,
  codigoSchema,
  cpfSchema,
  cpfValido,
  emailSchema,
  nascimentoSchema,
  senhaForteSchema,
} from './comum'

/** Formulários e respostas de autenticação (STY001 a STY006, ADR-13 e ADR-21). */

/** Login por e-mail ou CPF (tela 01-login). Mensagem de falha sempre genérica (STY002-RN02). */
export const loginSchema = z.object({
  identifier: z
    .string({ error: MSG.obrigatorio })
    .trim()
    .min(1, { error: MSG.obrigatorio })
    .refine((v) => (v.includes('@') ? z.email().safeParse(v).success : cpfValido(v)), {
      error: 'Informe um e-mail ou CPF válido.',
    })
    .transform((v) => (v.includes('@') ? v.toLowerCase() : apenasDigitos(v))),
  password: z.string({ error: MSG.obrigatorio }).min(1, { error: 'Informe sua senha.' }),
})

export const cadastroSchema = z
  .object({
    fullName: z
      .string({ error: MSG.obrigatorio })
      .trim()
      .min(1, { error: MSG.obrigatorio })
      .refine((v) => v.split(/\s+/).length >= 2, { error: 'Informe nome e sobrenome.' })
      .refine((v) => v.length <= 120, { error: 'Use no máximo 120 caracteres.' }),
    email: emailSchema,
    cpf: cpfSchema,
    birthDate: nascimentoSchema,
    password: senhaForteSchema,
    passwordConfirmation: z.string({ error: MSG.obrigatorio }).min(1, { error: MSG.obrigatorio }),
    acceptTerms: z.boolean().refine((v) => v, { error: 'Aceite os Termos de Uso e a Política de Privacidade para continuar.' }),
  })
  .refine((d) => d.password === d.passwordConfirmation, { error: MSG.senhasDiferentes, path: ['passwordConfirmation'] })

export const emailFormSchema = z.object({ email: emailSchema })

export const codigoFormSchema = z.object({ code: codigoSchema })

export const redefinirSenhaSchema = z
  .object({
    password: senhaForteSchema,
    passwordConfirmation: z.string({ error: MSG.obrigatorio }).min(1, { error: MSG.obrigatorio }),
  })
  .refine((d) => d.password === d.passwordConfirmation, { error: MSG.senhasDiferentes, path: ['passwordConfirmation'] })

export const usuarioSessaoSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable().optional(),
})

/** Login concluído: token de acesso fica só em memória no web (ADR-18). */
export const sessaoSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number(),
  user: usuarioSessaoSchema,
})

/** Login com 2FA habilitado devolve um desafio em vez da sessão (STY002 passo 5). */
export const respostaLoginSchema = z.union([
  sessaoSchema.extend({ status: z.literal('AUTHENTICATED') }),
  z.object({
    status: z.literal('TWO_FACTOR_REQUIRED'),
    challengeId: z.string(),
    method: z.enum(['APP', 'EMAIL']),
  }),
])

/** Cadastro e pedidos de código devolvem quando o código expira (telas 03 e 05). */
export const codigoEnviadoSchema = z.object({
  email: z.string(),
  expiresAt: z.string(),
  resendAvailableAt: z.string(),
})

export type LoginInput = z.input<typeof loginSchema>
export type LoginPayload = z.output<typeof loginSchema>
export type CadastroInput = z.input<typeof cadastroSchema>
export type CadastroPayload = z.output<typeof cadastroSchema>
export type RedefinirSenhaInput = z.input<typeof redefinirSenhaSchema>
export type Sessao = z.infer<typeof sessaoSchema>
export type UsuarioSessao = z.infer<typeof usuarioSessaoSchema>
export type RespostaLogin = z.infer<typeof respostaLoginSchema>
export type CodigoEnviado = z.infer<typeof codigoEnviadoSchema>
