import { problemaSchema, type Problema } from '@steely/schemas'
import { tokenDeAcesso } from './token'

/** Origem da API: VITE_API_URL ou o próprio site (proxy do Vite, mock ou mesmo domínio). */
export const API_ORIGEM = import.meta.env.VITE_API_URL || (globalThis.location?.origin ?? 'http://localhost')
export const API_BASE = `${API_ORIGEM}/api/v1`
const TEMPO_LIMITE_MS = 15_000

/** Erro único da API: Problem Details (RFC 9457) + Retry-After (ADR-13, ADR-18). */
export class ApiError extends Error {
  readonly status: number
  readonly code: string | undefined
  readonly problema: Problema
  readonly retryAfterSegundos: number | null

  constructor(status: number, problema: Problema, retryAfterSegundos: number | null = null) {
    super(problema.detail ?? problema.title ?? `Erro ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.code = problema.code
    this.problema = problema
    this.retryAfterSegundos = retryAfterSegundos
  }

  /** Mensagens de validação por campo vindas de errors[] (ex.: { email: 'Já cadastrado' }). */
  get errosPorCampo(): Record<string, string> {
    const saida: Record<string, string> = {}
    for (const e of this.problema.errors ?? []) {
      const campo = e.field ?? e.pointer?.split('/').pop()
      if (campo && !saida[campo]) saida[campo] = e.message
    }
    return saida
  }
}

type Parser<T> = { parse: (dados: unknown) => T }

export type OpcoesRequisicao = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Token do Cloudflare Turnstile, quando a rota exigir (ADR-21). */
  captchaToken?: string | null
  /** UUID v4 reaproveitado em todo retry de ação crítica (ADR-14). */
  idempotencyKey?: string
  /** false para rotas públicas de autenticação (não tenta renovar o token em 401). */
  autenticada?: boolean
  signal?: AbortSignal
}

export function lerRetryAfter(valor: string | null): number | null {
  if (!valor) return null
  const segundos = Number(valor)
  if (Number.isFinite(segundos)) return Math.max(0, Math.round(segundos))
  const data = Date.parse(valor)
  return Number.isNaN(data) ? null : Math.max(0, Math.round((data - Date.now()) / 1000))
}

async function lerProblema(resposta: Response): Promise<Problema> {
  const dados: unknown = await resposta.json().catch(() => null)
  const lido = problemaSchema.safeParse(dados)
  return lido.success ? lido.data : { status: resposta.status, title: resposta.statusText }
}

async function executar(caminho: string, opcoes: OpcoesRequisicao): Promise<Response> {
  const headers = new Headers({ Accept: 'application/json, application/problem+json' })
  const token = tokenDeAcesso.obter()
  if (token && opcoes.autenticada !== false) headers.set('Authorization', `Bearer ${token}`)
  headers.set('X-Correlation-Id', crypto.randomUUID())
  if (opcoes.idempotencyKey) headers.set('Idempotency-Key', opcoes.idempotencyKey)
  if (opcoes.captchaToken) headers.set('X-Turnstile-Token', opcoes.captchaToken)

  let body: BodyInit | undefined
  if (opcoes.body instanceof FormData) body = opcoes.body
  else if (opcoes.body !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(opcoes.body)
  }

  const sinais = [AbortSignal.timeout(TEMPO_LIMITE_MS), opcoes.signal].filter(Boolean) as AbortSignal[]
  const signal = typeof AbortSignal.any === 'function' ? AbortSignal.any(sinais) : sinais[0]
  const url = new URL(`${API_BASE}${caminho}`, globalThis.location?.origin ?? 'http://localhost')

  try {
    return await fetch(url, {
      method: opcoes.method ?? 'GET',
      headers,
      body,
      credentials: 'include',
      signal,
    })
  } catch (erro) {
    if (opcoes.signal?.aborted) throw erro
    throw new ApiError(0, {
      code: 'NETWORK_ERROR',
      title: 'Sem conexão',
      detail: 'Não foi possível falar com o Steely. Verifique sua conexão e tente de novo.',
    })
  }
}

/** Renovação única compartilhada: várias requisições com 401 esperam o mesmo refresh. */
let renovacaoEmAndamento: Promise<boolean> | null = null
let aoRenovar: (() => Promise<boolean>) | null = null
let aoExpirar: (() => void) | null = null

export function configurarSessao(opcoes: { renovar: () => Promise<boolean>; expirar: () => void }) {
  aoRenovar = opcoes.renovar
  aoExpirar = opcoes.expirar
}

async function renovarUmaVez(): Promise<boolean> {
  if (!aoRenovar) return false
  renovacaoEmAndamento ??= aoRenovar().finally(() => {
    renovacaoEmAndamento = null
  })
  return renovacaoEmAndamento
}

/**
 * Faz a requisição, valida a resposta com o schema (Zod) e converte erros em ApiError.
 * Em 401 de rota autenticada, tenta renovar o token uma vez e repete a chamada.
 */
export async function api<T>(caminho: string, schema: Parser<T> | null, opcoes: OpcoesRequisicao = {}): Promise<T> {
  let resposta = await executar(caminho, opcoes)

  if (resposta.status === 401 && opcoes.autenticada !== false && tokenDeAcesso.obter()) {
    const renovou = await renovarUmaVez()
    if (renovou) resposta = await executar(caminho, opcoes)
    else aoExpirar?.()
  }

  if (!resposta.ok) {
    throw new ApiError(resposta.status, await lerProblema(resposta), lerRetryAfter(resposta.headers.get('Retry-After')))
  }

  if (resposta.status === 204 || !schema) return undefined as T
  return schema.parse(await resposta.json())
}

/** Cabeçalho interno: pede para não tentar renovar o token em 401 (usado durante a própria renovação). */
export const SEM_RENOVACAO = 'X-Steely-Sem-Renovacao'

async function enviar(requisicao: Request): Promise<Response> {
  // Ajusta os cabeçalhos na própria requisição: recriá-la com corpo exige "duplex" no navegador.
  const headers = requisicao.headers
  headers.delete(SEM_RENOVACAO)
  const token = tokenDeAcesso.obter()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (!headers.has('X-Correlation-Id')) headers.set('X-Correlation-Id', crypto.randomUUID())
  try {
    return await fetch(requisicao)
  } catch (erro) {
    if (requisicao.signal?.aborted) throw erro
    throw new ApiError(0, {
      code: 'NETWORK_ERROR',
      title: 'Sem conexão',
      detail: 'Não foi possível falar com o Steely. Verifique sua conexão e tente de novo.',
    })
  }
}

/**
 * fetch usado pelo cliente gerado (openapi-fetch): anexa o JWT e o X-Correlation-Id e, em 401,
 * renova o token uma vez e repete a chamada (mesmo comportamento de `api`).
 */
export async function fetchAutenticado(requisicao: Request): Promise<Response> {
  const podeRenovar = !requisicao.headers.has(SEM_RENOVACAO)
  const copia = requisicao.clone()
  let resposta = await enviar(requisicao)
  if (resposta.status === 401 && podeRenovar && tokenDeAcesso.obter()) {
    if (await renovarUmaVez()) resposta = await enviar(copia)
    else aoExpirar?.()
  }
  return resposta
}
