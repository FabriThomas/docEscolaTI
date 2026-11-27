import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { z } from '@steely/schemas'
import { server } from '@/mocks/server'
import { api, ApiError, configurarSessao } from './http'
import { mensagemDeErro } from './erros'
import { tokenDeAcesso } from './token'

describe('cliente HTTP (ADR-13 e ADR-18)', () => {
  it('envia Authorization e X-Correlation-Id e valida a resposta', async () => {
    let cabecalhos: Headers | undefined
    server.use(
      http.get('*/api/v1/teste', ({ request }) => {
        cabecalhos = request.headers
        return HttpResponse.json({ ok: true })
      }),
    )
    tokenDeAcesso.definir('abc')
    await expect(api('/teste', z.object({ ok: z.boolean() }))).resolves.toEqual({ ok: true })
    expect(cabecalhos?.get('Authorization')).toBe('Bearer abc')
    expect(cabecalhos?.get('X-Correlation-Id')).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('converte Problem Details (RFC 9457) em ApiError com Retry-After', async () => {
    server.use(
      http.post('*/api/v1/teste', () =>
        HttpResponse.json(
          { title: 'Bloqueado', status: 429, code: 'LOGIN_LOCKED', detail: 'Aguarde.', errors: [{ field: 'email', message: 'Inválido' }] },
          { status: 429, headers: { 'Content-Type': 'application/problem+json', 'Retry-After': '120' } },
        ),
      ),
    )
    const erro = await api('/teste', null, { method: 'POST' }).catch((e: unknown) => e)
    expect(erro).toBeInstanceOf(ApiError)
    expect((erro as ApiError).code).toBe('LOGIN_LOCKED')
    expect((erro as ApiError).retryAfterSegundos).toBe(120)
    expect((erro as ApiError).errosPorCampo).toEqual({ email: 'Inválido' })
  })

  it('envia o token do captcha e a chave de idempotência quando informados', async () => {
    let cabecalhos: Headers | undefined
    server.use(
      http.post('*/api/v1/teste', ({ request }) => {
        cabecalhos = request.headers
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await api('/teste', null, { method: 'POST', captchaToken: 'tk', idempotencyKey: 'chave-1' })
    expect(cabecalhos?.get('X-Turnstile-Token')).toBe('tk')
    expect(cabecalhos?.get('Idempotency-Key')).toBe('chave-1')
  })

  it('renova o token uma vez em 401 e repete a chamada', async () => {
    let chamadas = 0
    server.use(
      http.get('*/api/v1/protegida', ({ request }) => {
        chamadas++
        return request.headers.get('Authorization') === 'Bearer novo'
          ? HttpResponse.json({ ok: true })
          : HttpResponse.json({ code: 'UNAUTHENTICATED' }, { status: 401 })
      }),
    )
    tokenDeAcesso.definir('vencido')
    configurarSessao({
      renovar: async () => {
        tokenDeAcesso.definir('novo')
        return true
      },
      expirar: () => {},
    })
    await expect(api('/protegida', z.object({ ok: z.boolean() }))).resolves.toEqual({ ok: true })
    expect(chamadas).toBe(2)
  })

  it('traduz falha de rede para português', async () => {
    server.use(http.get('*/api/v1/teste', () => HttpResponse.error()))
    const erro = await api('/teste', null).catch((e: unknown) => e)
    expect(mensagemDeErro(erro)).toMatch(/Verifique sua conexão/)
  })
})
