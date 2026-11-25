import { z } from 'zod'
import { MSG, codigoSchema, senhaForteSchema } from './comum'

/** Perfil, segurança e exclusão de conta (STY007 a STY011, telas 052 a 054 e 056). */

export const perfilSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  bio: z.string(),
  region: z.string(),
  memberSince: z.string(),
  avatarUrl: z.string().nullable(),
  emailMasked: z.string(),
  emailVerified: z.boolean(),
  twoFactorEnabled: z.boolean(),
  reputation: z.object({
    average: z.number().nullable(),
    reviews: z.number(),
    deals: z.number(),
    criteria: z.array(z.object({ key: z.enum(['communication', 'punctuality', 'listingAccuracy']), average: z.number() })),
  }),
  esg: z.object({
    kgAvoided: z.number(),
    badges: z.array(z.object({ id: z.string(), kind: z.enum(['recycler', 'donor']) })),
  }),
  listings: z.object({ active: z.number(), paused: z.number() }),
  coins: z.number(),
})

/** Edição de perfil (tela 053). Só o bairro/região aparece; contato nunca fica público (STY011-RN04). */
export const editarPerfilSchema = z.object({
  displayName: z
    .string({ error: MSG.obrigatorio })
    .trim()
    .min(2, { error: 'Use pelo menos 2 caracteres.' })
    .max(40, { error: 'Use no máximo 40 caracteres.' })
    .refine((v) => !/@|\d{4,}/.test(v), { error: 'Não use e-mail ou telefone no nome de exibição.' }),
  bio: z.string().trim().max(160, { error: 'Use no máximo 160 caracteres.' }),
  region: z.string({ error: MSG.obrigatorio }).trim().min(1, { error: 'Escolha sua região.' }),
})

export const FOTO_TIPOS = ['image/jpeg', 'image/png', 'image/webp'] as const
export const FOTO_MAX_BYTES = 5 * 1024 * 1024

export const segurancaSchema = z.object({
  twoFactor: z.object({ enabled: z.boolean(), method: z.enum(['APP', 'EMAIL']).nullable() }),
  passwordChangedAt: z.string(),
  sessions: z.array(
    z.object({
      id: z.string(),
      device: z.string(),
      kind: z.enum(['mobile', 'desktop']),
      location: z.string(),
      lastActiveAt: z.string(),
      current: z.boolean(),
    }),
  ),
})

/** Alterar senha (STY008): exige a senha atual e a nova não pode ser igual (RN02). */
export const trocarSenhaSchema = z
  .object({
    currentPassword: z.string({ error: MSG.obrigatorio }).min(1, { error: 'Informe sua senha atual.' }),
    newPassword: senhaForteSchema,
    newPasswordConfirmation: z.string({ error: MSG.obrigatorio }).min(1, { error: MSG.obrigatorio }),
  })
  .refine((d) => d.newPassword === d.newPasswordConfirmation, { error: MSG.senhasDiferentes, path: ['newPasswordConfirmation'] })
  .refine((d) => d.newPassword !== d.currentPassword, { error: 'A nova senha precisa ser diferente da atual.', path: ['newPassword'] })

/** Início da ativação do 2FA por aplicativo (STY007 passo 4). */
export const configurar2faSchema = z.object({
  secret: z.string(),
  otpauthUrl: z.string(),
})

export const codigosRecuperacaoSchema = z.object({ codes: z.array(z.string()) })

export const confirmarCodigoSchema = z.object({ code: codigoSchema })

/** Desativar 2FA exige senha atual e código válido (STY007-RN03). */
export const desativar2faSchema = z.object({
  password: z.string({ error: MSG.obrigatorio }).min(1, { error: 'Informe sua senha atual.' }),
  code: codigoSchema,
})

export const PALAVRA_EXCLUSAO = 'EXCLUIR'

/** Pedido de exclusão (tela 056, STY010-RN03 e ADR-07): ciência, palavra de confirmação e senha atual. */
export const excluirContaSchema = z.object({
  acknowledge: z.boolean().refine((v) => v, { error: 'Confirme que entende as consequências.' }),
  confirmation: z
    .string({ error: MSG.obrigatorio })
    .trim()
    .refine((v) => v === PALAVRA_EXCLUSAO, { error: `Digite ${PALAVRA_EXCLUSAO} em letras maiúsculas.` }),
  password: z.string({ error: MSG.obrigatorio }).min(1, { error: 'Informe sua senha atual.' }),
})

export const exclusaoAgendadaSchema = z.object({ effectiveAt: z.string() })

export type Perfil = z.infer<typeof perfilSchema>
export type EditarPerfilInput = z.input<typeof editarPerfilSchema>
export type Seguranca = z.infer<typeof segurancaSchema>
export type SessaoAtiva = Seguranca['sessions'][number]
export type TrocarSenhaInput = z.input<typeof trocarSenhaSchema>
export type Desativar2faInput = z.input<typeof desativar2faSchema>
export type ExcluirContaInput = z.input<typeof excluirContaSchema>
