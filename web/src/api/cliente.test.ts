/// <reference types="node" />
import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { assinarJwt, lerSessaoDoToken } from '@/mocks/jwt'
import { cliente, resultado } from './cliente'
import { ApiError } from './http'
import { tokenDeAcesso } from './token'

describe('cliente gerado do contrato do FastAPI (openapi-fetch)', () => {
  it('lê GET /health tipado', async () => {
    const saude = await resultado(cliente.GET('/api/v1/health'))
    expect(saude).toEqual({ status: 'ok', coreDb: 'not_configured', daasDb: 'not_configured' })
  })

  it('converte o 401 de GET /me em ApiError com o code do FastAPI', async () => {
    server.use(
      http.get('*/api/v1/me', () =>
        HttpResponse.json(
          { type: 'https://steely.app/problems/unauthenticated', title: 'Unauthorized', status: 401, code: 'UNAUTHENTICATED', correlationId: 'x', errors: [] },
          { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    )
    const erro = await resultado(cliente.GET('/api/v1/me')).catch((e: unknown) => e)
    expect(erro).toBeInstanceOf(ApiError)
    expect((erro as ApiError).code).toBe('UNAUTHENTICATED')
  })

  it('envia o JWT e o X-Correlation-Id', async () => {
    let cabecalhos: Headers | undefined
    server.use(
      http.get('*/api/v1/me', ({ request }) => {
        cabecalhos = request.headers
        return HttpResponse.json({ id: 'u1', email: null, role: 'authenticated' })
      }),
    )
    tokenDeAcesso.definir('abc')
    await expect(resultado(cliente.GET('/api/v1/me'))).resolves.toEqual({ id: 'u1', email: null, role: 'authenticated' })
    expect(cabecalhos?.get('Authorization')).toBe('Bearer abc')
    expect(cabecalhos?.get('X-Correlation-Id')).toMatch(/^[0-9a-f-]{36}$/)
  })
})

describe('JWT de desenvolvimento (formato do Supabase Auth)', () => {
  it('é um HS256 válido para o mesmo segredo do backend e carrega o id da sessão', async () => {
    const segredo = 'segredo-de-teste'
    const token = await assinarJwt({ sub: 'usr_ana', aud: 'authenticated', sid: 'ses_1', exp: 9_999_999_999 }, segredo)
    const [cabecalho, carga, assinatura] = token.split('.')
    const esperada = createHmac('sha256', segredo).update(`${cabecalho}.${carga}`).digest('base64url')
    expect(assinatura).toBe(esperada)
    expect(JSON.parse(Buffer.from(cabecalho as string, 'base64url').toString())).toEqual({ alg: 'HS256', typ: 'JWT' })
    expect(lerSessaoDoToken(token)).toBe('ses_1')
    expect(lerSessaoDoToken('mock.ses_2')).toBe('ses_2')
  })
})
