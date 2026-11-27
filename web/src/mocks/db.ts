import { DEMO } from './demo'
import { reiniciarAnuncios } from './anuncios'

/** Estado em memória da API simulada. No navegador, persiste na sessionStorage da aba. */

export type SessaoMock = {
  id: string
  device: string
  kind: 'mobile' | 'desktop'
  location: string
  lastActiveAt: string
}

export type UsuarioMock = {
  id: string
  fullName: string
  displayName: string
  email: string
  cpf: string
  birthDate: string
  password: string
  previousPasswords: string[]
  bio: string
  region: string
  memberSince: string
  avatarUrl: string | null
  status: 'ACTIVE' | 'PENDING_VERIFICATION' | 'GRACE_PERIOD'
  deletionEffectiveAt: string | null
  twoFactor: { enabled: boolean; method: 'APP' | 'EMAIL' | null }
  passwordChangedAt: string
  sessions: SessaoMock[]
  reputation: { average: number | null; reviews: number; deals: number; criteria: { key: 'communication' | 'punctuality' | 'listingAccuracy'; average: number }[] }
  esg: { kgAvoided: number; badges: { id: string; kind: 'recycler' | 'donor' }[] }
  listings: { active: number; paused: number }
  coins: number
}

export type Estado = {
  usuarios: UsuarioMock[]
  /** Simula o cookie HttpOnly de renovação: id da sessão deste navegador. */
  cookieRenovacao: string | null
}

const diasAtras = (dias: number) => new Date(Date.now() - dias * 86_400_000).toISOString()

export function estadoInicial(): Estado {
  return {
    cookieRenovacao: null,
    usuarios: [
      {
        id: 'usr_ana',
        fullName: 'Ana Pereira Souza',
        displayName: 'Ana P.',
        email: DEMO.contas[0].email,
        cpf: '52998224725',
        birthDate: '1994-05-12',
        password: DEMO.senha,
        previousPasswords: [],
        bio: 'Monto PCs há 6 anos. Peças testadas e com nota de procedência.',
        region: 'Zona 7, Maringá – PR',
        memberSince: '2026-03-04T12:00:00.000Z',
        avatarUrl: null,
        status: 'ACTIVE',
        deletionEffectiveAt: null,
        twoFactor: { enabled: true, method: 'APP' },
        passwordChangedAt: diasAtras(61),
        sessions: [
          { id: 'ses_app', device: 'iPhone 13 (app Steely)', kind: 'mobile', location: 'Maringá, PR', lastActiveAt: diasAtras(3) },
        ],
        reputation: {
          average: 4.8,
          reviews: 23,
          deals: 31,
          criteria: [
            { key: 'communication', average: 4.9 },
            { key: 'punctuality', average: 4.6 },
            { key: 'listingAccuracy', average: 4.8 },
          ],
        },
        esg: { kgAvoided: 7.4, badges: [{ id: 'b1', kind: 'recycler' }, { id: 'b2', kind: 'donor' }] },
        listings: { active: 3, paused: 1 },
        coins: 340,
      },
      {
        id: 'usr_bruno',
        fullName: 'Bruno Lima Costa',
        displayName: 'Bruno L.',
        email: DEMO.contas[1].email,
        cpf: '11144477735',
        birthDate: '1990-09-30',
        password: DEMO.senha,
        previousPasswords: [],
        bio: '',
        region: 'Centro, Maringá – PR',
        memberSince: '2026-10-20T12:00:00.000Z',
        avatarUrl: null,
        status: 'ACTIVE',
        deletionEffectiveAt: null,
        twoFactor: { enabled: false, method: null },
        passwordChangedAt: diasAtras(28),
        sessions: [],
        reputation: { average: null, reviews: 0, deals: 0, criteria: [] },
        esg: { kgAvoided: 0, badges: [] },
        listings: { active: 0, paused: 0 },
        coins: 0,
      },
    ],
  }
}

const CHAVE = 'steely-mock-db'

function carregar(): Estado {
  try {
    const salvo = globalThis.sessionStorage?.getItem(CHAVE)
    if (salvo) return JSON.parse(salvo) as Estado
  } catch {
    /* sem storage (testes, aba privada): começa do zero */
  }
  return estadoInicial()
}

export let db: Estado = carregar()

export function salvar() {
  try {
    globalThis.sessionStorage?.setItem(CHAVE, JSON.stringify(db))
  } catch {
    /* ignora */
  }
}

/** Usado pelos testes para começar cada caso do zero. */
export function reiniciarDb() {
  db = estadoInicial()
  reiniciarAnuncios()
  tentativasLogin.clear()
  desafios2fa.clear()
  codigos.clear()
  segredos2fa.clear()
}

/** Falhas de login por identificador (ADR-21: captcha na 3ª falha, bloqueio na 5ª). */
export const tentativasLogin = new Map<string, { falhas: number; bloqueadoAte: number | null }>()
export const desafios2fa = new Map<string, string>()
export const codigos = new Map<string, { code: string; expiresAt: number; tentativas: number; finalidade: 'verificacao' | 'login' }>()
export const segredos2fa = new Map<string, string>()

export function usuarioPorSessao(sessaoId: string | null | undefined): UsuarioMock | undefined {
  if (!sessaoId) return undefined
  return db.usuarios.find((u) => u.sessions.some((s) => s.id === sessaoId))
}
