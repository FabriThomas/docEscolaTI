import { salvar, contar, listar, buscar, zerarBanco, lerInfo } from '../src/banco'
import { sincronizar, enviarFila } from '../src/sincronizar'
import { limparAparelho } from '../src/limpeza'
import { salvarTokens, lerAccess } from '../src/secureStorage'

async function criarMutacao(){
  await salvar('pending_mutations', {
    id: 'm1',
    tipo: 'CONFIRMAR_ENTREGA',
    caminho: '/orders/o1/delivery-confirmation',
    corpo: JSON.stringify({jti: 'qr-1'}),
    idempotency_key: 'chave-1',
    jti: 'qr-1',
    lido_em: Date.now(),
    tentativas: 0,
  })
}

beforeEach(async ()=>{
  await zerarBanco()
  await salvarTokens('access-mock-1', 'refresh-mock-1')
})

it('a fila manda a mutacao com Idempotency-Key e tira ela da fila (ADR-14)', async ()=>{
  const espiao = jest.spyOn(globalThis, 'fetch')
  await criarMutacao()
  await enviarFila()
  const chamada: any = espiao.mock.calls.find((c: any)=> String(c[0]).includes('delivery-confirmation'))
  expect(chamada[1].headers['Idempotency-Key']).toBe('chave-1')
  expect(await contar('pending_mutations')).toBe(0)
  espiao.mockRestore()
})

it('sem internet a mutacao continua na fila', async ()=>{
  const original = globalThis.fetch
  globalThis.fetch = jest.fn(async ()=>{ throw new Error('sem rede') }) as any
  await criarMutacao()
  await enviarFila()
  globalThis.fetch = original
  expect(await contar('pending_mutations')).toBe(1)
})

it('erro do servidor soma uma tentativa', async ()=>{
  const original = globalThis.fetch
  globalThis.fetch = jest.fn(async ()=> new Response(JSON.stringify({code: 'ERRO'}), {status: 500})) as any
  await criarMutacao()
  await enviarFila()
  globalThis.fetch = original
  const m: any = await buscar('pending_mutations', 'm1')
  expect(m.tentativas).toBe(1)
})

it('sincronizar baixa as mudancas e guarda o horario', async ()=>{
  const original = globalThis.fetch
  globalThis.fetch = jest.fn(async (url: any, opcoes: any)=>{
    if(String(url).includes('/sync/pull')){
      return new Response(JSON.stringify({
        changes: {
          meeting_points: {created: [{id: 'p1', nome: 'Praça', latitude: -23.4, longitude: -51.9}], updated: [], deleted: []},
          appointments: {created: [], updated: [], deleted: ['e-velho']},
        },
        timestamp: 1234,
      }), {status: 200})
    }
    return original(url, opcoes)
  }) as any
  await salvar('appointments', {id: 'e-velho', expira_em: Date.now() + 60000})
  await sincronizar()
  globalThis.fetch = original
  const pontos: any[] = await listar('meeting_points')
  expect(pontos[0].nome).toBe('Praça')
  expect(pontos[0].expira_em).toBeGreaterThan(Date.now())
  expect(await contar('appointments')).toBe(0)
  expect(await lerInfo('ultimo_pull')).toBe('1234')
})

it('limpeza apaga o banco e as chaves (ADR-23 e ADR-24)', async ()=>{
  await criarMutacao()
  await limparAparelho()
  expect(await contar('pending_mutations')).toBe(0)
  expect(await lerAccess()).toBeNull()
})
