import { delay, http, HttpResponse } from 'msw'
import { CODIGOS_ERRO, FOTO_MAX_BYTES, FOTO_TIPOS } from '@steely/schemas'
import { codigos, db, desafios2fa, salvar, segredos2fa, tentativasLogin, usuarioPorSessao, type UsuarioMock } from './db'
import { DEMO, SEGREDO_JWT_DEV } from './demo'
import { assinarJwt, lerSessaoDoToken } from './jwt'

/**
 * API simulada com o mesmo contrato esperado do FastAPI (ADR-13): /api/v1, JSON em camelCase,
 * erros RFC 9457 com "code" estável e Retry-After em 429. Regras: ADR-21 (captcha e bloqueio),
 * STY001 a STY011 e ADR-07 (exclusão).
 */

const BASE = '*/api/v1'
const LATENCIA = import.meta.env.MODE === 'test' ? 0 : 350
const MIN = 60_000

const redefinicoes = new Map<string, string>()

function problema(status: number, code: string, detail: string, extras: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  return HttpResponse.json(
    { type: `https://steely.dev/erros/${code.toLowerCase()}`, title: detail, status, detail, code, correlationId: crypto.randomUUID(), ...extras },
    { status, headers: { 'Content-Type': 'application/problem+json', ...headers } },
  )
}

const semCaptcha = (request: Request) => !request.headers.get('X-Turnstile-Token')
const captchaObrigatorio = () =>
  problema(403, CODIGOS_ERRO.captchaObrigatorio, 'Confirme que você não é um robô para continuar.')

function dispositivo(request: Request) {
  const ua = request.headers.get('User-Agent') ?? ''
  const navegador = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Navegador'
  const sistema = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'computador'
  const movel = /Android|iPhone|iPad|Mobile/.test(ua)
  return { device: `${navegador} no ${sistema}`, kind: (movel ? 'mobile' : 'desktop') as 'mobile' | 'desktop' }
}

async function novaSessao(usuario: UsuarioMock, request: Request) {
  const id = `ses_${crypto.randomUUID().slice(0, 8)}`
  usuario.sessions.push({ id, ...dispositivo(request), location: 'Maringá, PR', lastActiveAt: new Date().toISOString() })
  db.cookieRenovacao = id
  salvar()
  return emitirToken(usuario, id)
}

async function emitirToken(usuario: UsuarioMock, sessaoId: string) {
  // Com o segredo de teste do backend, o token é um JWT HS256 que o FastAPI aceita em GET /me.
  const agora = Math.floor(Date.now() / 1000)
  const accessToken = SEGREDO_JWT_DEV
    ? await assinarJwt(
        { sub: usuario.id, email: usuario.email, role: 'authenticated', aud: 'authenticated', sid: sessaoId, iat: agora, exp: agora + 900 },
        SEGREDO_JWT_DEV,
      )
    : `mock.${sessaoId}`
  return {
    accessToken,
    expiresIn: 900,
    user: { id: usuario.id, displayName: usuario.displayName, avatarUrl: usuario.avatarUrl },
  }
}

function sessaoDoToken(request: Request) {
  const token = lerSessaoDoToken(request.headers.get('Authorization')?.replace(/^Bearer /, ''))
  const usuario = usuarioPorSessao(token)
  if (!usuario || !token) return null
  const sessao = usuario.sessions.find((s) => s.id === token)
  if (sessao) sessao.lastActiveAt = new Date().toISOString()
  return { usuario, sessaoId: token }
}

const naoAutenticado = () => problema(401, 'UNAUTHENTICATED', 'Sua sessão expirou. Entre de novo.')

function acharPorIdentificador(identificador: string) {
  const id = identificador.trim().toLowerCase()
  return db.usuarios.find((u) => u.email === id || u.cpf === id.replace(/\D/g, ''))
}

function gerarCodigo(email: string, finalidade: 'verificacao' | 'login', validadeMin: number) {
  const agora = Date.now()
  codigos.set(`${email}:${finalidade}`, { code: DEMO.codigo, expiresAt: agora + validadeMin * MIN, tentativas: 0, finalidade })
  return { email, expiresAt: new Date(agora + validadeMin * MIN).toISOString(), resendAvailableAt: new Date(agora + MIN).toISOString() }
}

function conferirCodigo(email: string, finalidade: 'verificacao' | 'login', code: string) {
  const chave = `${email}:${finalidade}`
  const registro = codigos.get(chave)
  if (!registro || registro.expiresAt < Date.now()) {
    codigos.delete(chave)
    return problema(400, CODIGOS_ERRO.codigoExpirado, 'Este código expirou. Peça um novo.')
  }
  if (registro.code !== code) {
    registro.tentativas++
    // Três erros invalidam o código (STY001-RN06, STY006 fluxo alternativo 2).
    if (registro.tentativas >= 3) {
      codigos.delete(chave)
      return problema(400, CODIGOS_ERRO.codigoExpirado, 'Você errou o código 3 vezes. Peça um novo código.')
    }
    return problema(400, CODIGOS_ERRO.codigoInvalido, `Código incorreto. Restam ${3 - registro.tentativas} tentativa(s).`)
  }
  codigos.delete(chave)
  return null
}

function perfil(u: UsuarioMock) {
  return {
    id: u.id,
    displayName: u.displayName,
    bio: u.bio,
    region: u.region,
    memberSince: u.memberSince,
    avatarUrl: u.avatarUrl,
    emailMasked: u.email.replace(/^(.{2})[^@]*(@.*)$/, '$1•••••$2'),
    emailVerified: u.status !== 'PENDING_VERIFICATION',
    twoFactorEnabled: u.twoFactor.enabled,
    reputation: u.reputation,
    esg: u.esg,
    listings: u.listings,
    coins: u.coins,
  }
}

function seguranca(u: UsuarioMock, sessaoAtual: string) {
  return {
    twoFactor: u.twoFactor,
    passwordChangedAt: u.passwordChangedAt,
    sessions: [...u.sessions]
      .sort((a, b) => (a.id === sessaoAtual ? -1 : b.id === sessaoAtual ? 1 : b.lastActiveAt.localeCompare(a.lastActiveAt)))
      .map((s) => ({ ...s, current: s.id === sessaoAtual })),
  }
}

const novosCodigosRecuperacao = () =>
  Array.from({ length: 8 }, () => {
    const parte = () => Math.random().toString(36).slice(2, 6)
    return `${parte()}-${parte()}`
  })

export const handlers = [
  // ---------------- Rotas que o FastAPI já tem (EDTS-374) ----------------
  http.get(`${BASE}/health`, () => HttpResponse.json({ status: 'ok', coreDb: 'not_configured', daasDb: 'not_configured' })),

  http.get(`${BASE}/me`, async ({ request }) => {
    const atual = sessaoDoToken(request)
    if (!atual) return naoAutenticado()
    return HttpResponse.json({ id: atual.usuario.id, email: atual.usuario.email, role: 'authenticated' })
  }),

  // ---------------- Autenticação ----------------
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    await delay(LATENCIA)
    const { identifier, password } = (await request.json()) as { identifier: string; password: string }
    const chave = identifier.trim().toLowerCase()
    const tentativa = tentativasLogin.get(chave) ?? { falhas: 0, bloqueadoAte: null }

    if (tentativa.bloqueadoAte && tentativa.bloqueadoAte > Date.now()) {
      const segundos = Math.ceil((tentativa.bloqueadoAte - Date.now()) / 1000)
      return problema(429, CODIGOS_ERRO.loginBloqueado, 'Acesso bloqueado temporariamente por excesso de tentativas.', {}, { 'Retry-After': String(segundos) })
    }
    // 3 ou 4 falhas na janela: captcha obrigatório (ADR-21).
    if (tentativa.falhas >= 3 && semCaptcha(request)) return captchaObrigatorio()

    const usuario = acharPorIdentificador(identifier)
    if (!usuario || usuario.password !== password) {
      tentativa.falhas++
      if (tentativa.falhas >= 5) {
        tentativasLogin.set(chave, { falhas: 0, bloqueadoAte: Date.now() + 15 * MIN })
        return problema(
          429,
          CODIGOS_ERRO.loginBloqueado,
          'Acesso bloqueado por 15 minutos por excesso de tentativas. Avisamos o titular da conta por e-mail.',
          {},
          { 'Retry-After': String(15 * 60) },
        )
      }
      tentativasLogin.set(chave, tentativa)
      return problema(401, CODIGOS_ERRO.credenciaisInvalidas, 'E-mail, CPF ou senha incorretos.')
    }

    tentativasLogin.delete(chave)
    if (usuario.status === 'PENDING_VERIFICATION') {
      return problema(403, CODIGOS_ERRO.contaNaoVerificada, 'Sua conta ainda não foi verificada.', { email: usuario.email })
    }
    if (usuario.status === 'GRACE_PERIOD') {
      return problema(403, CODIGOS_ERRO.contaEmCarencia, 'Sua conta está em processo de exclusão.', { effectiveAt: usuario.deletionEffectiveAt })
    }
    if (usuario.twoFactor.enabled) {
      const challengeId = crypto.randomUUID()
      desafios2fa.set(challengeId, usuario.id)
      return HttpResponse.json({ status: 'TWO_FACTOR_REQUIRED', challengeId, method: usuario.twoFactor.method ?? 'APP' })
    }
    return HttpResponse.json({ status: 'AUTHENTICATED', ...(await novaSessao(usuario, request)) })
  }),

  http.post(`${BASE}/auth/login/2fa`, async ({ request }) => {
    await delay(LATENCIA)
    const { challengeId, code } = (await request.json()) as { challengeId: string; code: string }
    const usuario = db.usuarios.find((u) => u.id === desafios2fa.get(challengeId))
    if (!usuario) return problema(400, CODIGOS_ERRO.codigoExpirado, 'A verificação expirou. Entre de novo.')
    if (code !== DEMO.codigo) return problema(400, CODIGOS_ERRO.codigoInvalido, 'Código incorreto. Confira no seu aplicativo autenticador.')
    desafios2fa.delete(challengeId)
    return HttpResponse.json(await novaSessao(usuario, request))
  }),

  http.post(`${BASE}/auth/reactivate`, async ({ request }) => {
    await delay(LATENCIA)
    const { identifier, password } = (await request.json()) as { identifier: string; password: string }
    const usuario = acharPorIdentificador(identifier)
    if (!usuario || usuario.password !== password) return problema(401, CODIGOS_ERRO.credenciaisInvalidas, 'E-mail, CPF ou senha incorretos.')
    usuario.status = 'ACTIVE'
    usuario.deletionEffectiveAt = null
    return HttpResponse.json(await novaSessao(usuario, request))
  }),

  http.post(`${BASE}/auth/signup`, async ({ request }) => {
    await delay(LATENCIA)
    if (semCaptcha(request)) return captchaObrigatorio()
    const dados = (await request.json()) as { fullName: string; email: string; cpf: string; birthDate: string; password: string }
    if (db.usuarios.some((u) => u.email === dados.email.toLowerCase() || u.cpf === dados.cpf)) {
      return problema(409, CODIGOS_ERRO.emailOuCpfEmUso, 'Já existe uma conta com este e-mail ou CPF.')
    }
    const nomes = dados.fullName.trim().split(/\s+/)
    db.usuarios.push({
      id: `usr_${crypto.randomUUID().slice(0, 8)}`,
      fullName: dados.fullName,
      displayName: `${nomes[0]} ${nomes.at(-1)?.[0] ?? ''}.`,
      email: dados.email.toLowerCase(),
      cpf: dados.cpf,
      birthDate: dados.birthDate,
      password: dados.password,
      previousPasswords: [],
      bio: '',
      region: '',
      memberSince: new Date().toISOString(),
      avatarUrl: null,
      status: 'PENDING_VERIFICATION',
      deletionEffectiveAt: null,
      twoFactor: { enabled: false, method: null },
      passwordChangedAt: new Date().toISOString(),
      sessions: [],
      reputation: { average: null, reviews: 0, deals: 0, criteria: [] },
      esg: { kgAvoided: 0, badges: [] },
      listings: { active: 0, paused: 0 },
      coins: 0,
    })
    salvar()
    return HttpResponse.json(gerarCodigo(dados.email.toLowerCase(), 'verificacao', 5), { status: 201 })
  }),

  http.post(`${BASE}/auth/verify-email`, async ({ request }) => {
    await delay(LATENCIA)
    const { email, code } = (await request.json()) as { email: string; code: string }
    const erro = conferirCodigo(email.toLowerCase(), 'verificacao', code)
    if (erro) return erro
    const usuario = db.usuarios.find((u) => u.email === email.toLowerCase())
    if (!usuario) return problema(400, CODIGOS_ERRO.codigoExpirado, 'Este código expirou. Peça um novo.')
    usuario.status = 'ACTIVE'
    usuario.coins += 50 // moedas de boas-vindas (STY001-RN08)
    return HttpResponse.json(await novaSessao(usuario, request))
  }),

  http.post(`${BASE}/auth/verify-email/resend`, async ({ request }) => {
    await delay(LATENCIA)
    const { email } = (await request.json()) as { email: string }
    return HttpResponse.json(gerarCodigo(email.toLowerCase(), 'verificacao', 5))
  }),

  http.post(`${BASE}/auth/recover`, async ({ request }) => {
    await delay(LATENCIA)
    if (semCaptcha(request)) return captchaObrigatorio()
    const { email } = (await request.json()) as { email: string }
    // Resposta neutra, exista ou não a conta (STY005-RN01).
    if (db.usuarios.some((u) => u.email === email.toLowerCase())) redefinicoes.set(DEMO.tokenRedefinicao, email.toLowerCase())
    return new HttpResponse(null, { status: 202 })
  }),

  http.post(`${BASE}/auth/reset-password`, async ({ request }) => {
    await delay(LATENCIA)
    const { token, password } = (await request.json()) as { token: string; password: string }
    const email = redefinicoes.get(token)
    const usuario = db.usuarios.find((u) => u.email === email)
    if (!usuario) return problema(400, CODIGOS_ERRO.linkInvalido, 'Este link expirou ou já foi usado.')
    if (password === usuario.password || usuario.previousPasswords.includes(password)) {
      return problema(422, CODIGOS_ERRO.senhaRepetida, 'Escolha uma senha que você não usou recentemente.', {
        errors: [{ field: 'password', message: 'Escolha uma senha que você não usou recentemente.' }],
      })
    }
    usuario.previousPasswords = [usuario.password, ...usuario.previousPasswords].slice(0, 5)
    usuario.password = password
    usuario.passwordChangedAt = new Date().toISOString()
    usuario.sessions = [] // encerra todas as sessões (STY005-RN05)
    redefinicoes.delete(token)
    salvar()
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${BASE}/auth/otp`, async ({ request }) => {
    await delay(LATENCIA)
    if (semCaptcha(request)) return captchaObrigatorio()
    const { email } = (await request.json()) as { email: string }
    return HttpResponse.json(gerarCodigo(email.toLowerCase(), 'login', 10))
  }),

  http.post(`${BASE}/auth/otp/verify`, async ({ request }) => {
    await delay(LATENCIA)
    const { email, code } = (await request.json()) as { email: string; code: string }
    const usuario = db.usuarios.find((u) => u.email === email.toLowerCase() && u.status === 'ACTIVE')
    const erro = conferirCodigo(email.toLowerCase(), 'login', code)
    if (erro) return erro
    if (!usuario) return problema(400, CODIGOS_ERRO.codigoInvalido, 'Código incorreto.')
    return HttpResponse.json({ status: 'AUTHENTICATED', ...(await novaSessao(usuario, request)) })
  }),

  http.post(`${BASE}/auth/refresh`, async () => {
    const usuario = usuarioPorSessao(db.cookieRenovacao)
    if (!usuario || !db.cookieRenovacao) return problema(401, 'UNAUTHENTICATED', 'Sem sessão ativa.')
    return HttpResponse.json(await emitirToken(usuario, db.cookieRenovacao))
  }),

  http.post(`${BASE}/auth/logout`, async ({ request }) => {
    await delay(LATENCIA)
    const atual = sessaoDoToken(request)
    if (atual) atual.usuario.sessions = atual.usuario.sessions.filter((s) => s.id !== atual.sessaoId)
    db.cookieRenovacao = null
    salvar()
    return new HttpResponse(null, { status: 204 })
  }),

  // ---------------- Conta ----------------
  http.get(`${BASE}/me/profile`, async ({ request }) => {
    await delay(LATENCIA)
    const atual = sessaoDoToken(request)
    if (!atual) return naoAutenticado()
    return HttpResponse.json(perfil(atual.usuario))
  }),

  http.patch(`${BASE}/me/profile`, async ({ request }) => {
    await delay(LATENCIA)
    const atual = sessaoDoToken(request)
    if (!atual) return naoAutenticado()
    const dados = (await request.json()) as { displayName: string; bio: string; region: string }
    Object.assign(atual.usuario, { displayName: dados.displayName.trim(), bio: dados.bio.trim(), region: dados.region.trim() })
    salvar()
    return HttpResponse.json(perfil(atual.usuario))
  }),

  http.post(`${BASE}/me/avatar`, async ({ request }) => {
    await delay(LATENCIA)
    const atual = sessaoDoToken(request)
    if (!atual) return naoAutenticado()
    const arquivo = (await request.formData()).get('file')
    if (!(arquivo instanceof File)) return problema(400, 'FILE_REQUIRED', 'Envie uma imagem.')
    if (!(FOTO_TIPOS as readonly string[]).includes(arquivo.type)) return problema(415, 'FILE_TYPE', 'Use uma foto JPG, PNG ou WebP.')
    if (arquivo.size > FOTO_MAX_BYTES) return problema(413, 'FILE_TOO_LARGE', 'A foto pode ter no máximo 5 MB.')
    atual.usuario.avatarUrl = URL.createObjectURL(arquivo)
    salvar()
    return HttpResponse.json(perfil(atual.usuario))
  }),

  http.get(`${BASE}/me/security`, async ({ request }) => {
    await delay(LATENCIA)
    const atual = sessaoDoToken(request)
    if (!atual) return naoAutenticado()
    return HttpResponse.json(seguranca(atual.usuario, atual.sessaoId))
  }),

  http.put(`${BASE}/me/password`, async ({ request }) => {
    await delay(LATENCIA)
    const atual = sessaoDoToken(request)
    if (!atual) return naoAutenticado()
    const { currentPassword, newPassword } = (await request.json()) as { currentPassword: string; newPassword: string }
    const u = atual.usuario
    if (currentPassword !== u.password) {
      return problema(422, CODIGOS_ERRO.senhaAtualIncorreta, 'A senha atual está incorreta.', {
        errors: [{ field: 'currentPassword', message: 'A senha atual está incorreta.' }],
      })
    }
    if (newPassword === u.password || u.previousPasswords.includes(newPassword)) {
      return problema(422, CODIGOS_ERRO.senhaRepetida, 'Escolha uma senha que você não usou recentemente.', {
        errors: [{ field: 'newPassword', message: 'Escolha uma senha que você não usou recentemente.' }],
      })
    }
    u.previousPasswords = [u.password, ...u.previousPasswords].slice(0, 5)
    u.password = newPassword
    u.passwordChangedAt = new Date().toISOString()
    u.sessions = u.sessions.filter((s) => s.id === atual.sessaoId) // encerra as demais (STY008-RN03)
    salvar()
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${BASE}/me/2fa/setup`, async ({ request }) => {
    await delay(LATENCIA)
    const atual = sessaoDoToken(request)
    if (!atual) return naoAutenticado()
    const secret = 'JBSWY3DPEHPK3PXP'
    segredos2fa.set(atual.usuario.id, secret)
    const conta = encodeURIComponent(`Steely:${atual.usuario.email}`)
    return HttpResponse.json({ secret, otpauthUrl: `otpauth://totp/${conta}?secret=${secret}&issuer=Steely` })
  }),

  http.post(`${BASE}/me/2fa/enable`, async ({ request }) => {
    await delay(LATENCIA)
    const atual = sessaoDoToken(request)
    if (!atual) return naoAutenticado()
    const { code } = (await request.json()) as { code: string }
    if (!segredos2fa.has(atual.usuario.id)) return problema(400, CODIGOS_ERRO.codigoExpirado, 'Comece a configuração de novo.')
    if (code !== DEMO.codigo) return problema(400, CODIGOS_ERRO.codigoInvalido, 'Código incorreto. Confira no aplicativo autenticador.')
    segredos2fa.delete(atual.usuario.id)
    atual.usuario.twoFactor = { enabled: true, method: 'APP' }
    salvar()
    return HttpResponse.json({ codes: novosCodigosRecuperacao() })
  }),

  http.post(`${BASE}/me/2fa/disable`, async ({ request }) => {
    await delay(LATENCIA)
    const atual = sessaoDoToken(request)
    if (!atual) return naoAutenticado()
    const { password, code } = (await request.json()) as { password: string; code: string }
    if (password !== atual.usuario.password) {
      return problema(422, CODIGOS_ERRO.senhaAtualIncorreta, 'A senha atual está incorreta.', {
        errors: [{ field: 'password', message: 'A senha atual está incorreta.' }],
      })
    }
    if (code !== DEMO.codigo) {
      return problema(400, CODIGOS_ERRO.codigoInvalido, 'Código incorreto.', { errors: [{ field: 'code', message: 'Código incorreto.' }] })
    }
    atual.usuario.twoFactor = { enabled: false, method: null }
    salvar()
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${BASE}/me/2fa/recovery-codes`, async ({ request }) => {
    await delay(LATENCIA)
    const atual = sessaoDoToken(request)
    if (!atual) return naoAutenticado()
    if (!atual.usuario.twoFactor.enabled) return problema(409, 'TWO_FACTOR_DISABLED', 'Ative a verificação em duas etapas primeiro.')
    return HttpResponse.json({ codes: novosCodigosRecuperacao() })
  }),

  http.delete(`${BASE}/me/sessions/:id`, async ({ request, params }) => {
    await delay(LATENCIA)
    const atual = sessaoDoToken(request)
    if (!atual) return naoAutenticado()
    if (params.id === atual.sessaoId) return problema(400, 'CURRENT_SESSION', 'Para encerrar esta sessão, use Sair.')
    atual.usuario.sessions = atual.usuario.sessions.filter((s) => s.id !== params.id)
    salvar()
    return new HttpResponse(null, { status: 204 })
  }),

  http.delete(`${BASE}/me/sessions`, async ({ request }) => {
    await delay(LATENCIA)
    const atual = sessaoDoToken(request)
    if (!atual) return naoAutenticado()
    atual.usuario.sessions = []
    db.cookieRenovacao = null
    salvar()
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${BASE}/me/deletion`, async ({ request }) => {
    await delay(LATENCIA)
    const atual = sessaoDoToken(request)
    if (!atual) return naoAutenticado()
    const { password } = (await request.json()) as { password: string; confirmation: string }
    const u = atual.usuario
    if (password !== u.password) {
      return problema(422, CODIGOS_ERRO.senhaAtualIncorreta, 'A senha atual está incorreta.', {
        errors: [{ field: 'password', message: 'A senha atual está incorreta.' }],
      })
    }
    // Saldo de moedas impede a exclusão (STY010-RN02 v2, ADR-07).
    if (u.coins > 0) {
      return problema(
        409,
        CODIGOS_ERRO.exclusaoBloqueada,
        `Você ainda tem ${u.coins} moedas. Use ou resgate o saldo antes de pedir a exclusão.`,
        { pending: [{ kind: 'COINS', amount: u.coins }] },
      )
    }
    const effectiveAt = new Date(Date.now() + 30 * 86_400_000).toISOString()
    u.status = 'GRACE_PERIOD'
    u.deletionEffectiveAt = effectiveAt
    u.sessions = []
    db.cookieRenovacao = null
    salvar()
    return HttpResponse.json({ effectiveAt }, { status: 202 })
  }),
]
