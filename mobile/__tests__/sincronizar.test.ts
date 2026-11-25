import { banco } from '../src/banco'
import { sincronizar, enviarFila } from '../src/sincronizar'
import { limparAparelho } from '../src/limpeza'
import { salvarTokens, lerAccess } from '../src/secureStorage'

async function criarMutacao(){
  await banco.write(async ()=>{
    await banco.get('pending_mutations').create((m: any)=>{
      m.tipo = 'CONFIRMAR_ENTREGA'
      m.caminho = '/orders/o1/delivery-confirmation'
      m.corpo = JSON.stringify({jti: 'qr-1'})
      m.idempotencyKey = 'chave-1'
      m.jti = 'qr-1'
      m.lidoEm = Date.now()
      m.tentativas = 0
      m.atualizadoEm = Date.now()
      m.apagado = false
    })
  })
}

beforeEach(async ()=>{
  await banco.write(async ()=>{ await banco.unsafeResetDatabase() })
})

it('a fila manda a mutacao com Idempotency-Key e tira ela da fila (ADR-14)', async ()=>{
  const espiao = jest.spyOn(globalThis, 'fetch')
  await criarMutacao()
  await enviarFila()
  const chamada: any = espiao.mock.calls.find((c: any)=> String(c[0]).includes('delivery-confirmation'))
  expect(chamada[1].headers['Idempotency-Key']).toBe('chave-1')
  expect(await banco.get('pending_mutations').query().fetchCount()).toBe(0)
  espiao.mockRestore()
})

it('sem internet a mutacao continua na fila', async ()=>{
  const original = globalThis.fetch
  globalThis.fetch = jest.fn(async ()=>{ throw new Error('sem rede') }) as any
  await criarMutacao()
  await enviarFila()
  expect(await banco.get('pending_mutations').query().fetchCount()).toBe(1)
  globalThis.fetch = original
})

it('sincronizar faz pull e push sem erro', async ()=>{
  await expect(sincronizar()).resolves.toBeUndefined()
})

it('limpeza apaga o banco e as chaves (ADR-23 e ADR-24)', async ()=>{
  await criarMutacao()
  await salvarTokens('a', 'b')
  await limparAparelho()
  expect(await banco.get('pending_mutations').query().fetchCount()).toBe(0)
  expect(await lerAccess()).toBeNull()
})
