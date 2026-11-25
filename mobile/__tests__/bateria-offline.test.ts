import NetInfo from '@react-native-community/netinfo'
import { salvar, listar, buscar, contar, lerInfo, salvarInfo, zerarBanco, tirarVencidos } from '../src/banco'
import { sincronizar, enviarFila, baixarMudancas, ligarSincronizacao } from '../src/sincronizar'
import { limparAparelho } from '../src/limpeza'
import { quandoExpirar } from '../src/api'
import { salvarTokens, lerAccess, lerRefresh } from '../src/secureStorage'

const original = globalThis.fetch
const HORA = 60 * 60 * 1000

function json(corpo: any, status = 200, headers: any = {}){
  return new Response(JSON.stringify(corpo), {status, headers})
}

function usarFetch(rota: (url: string, opcoes: any)=> any){
  const falso = jest.fn(async (url: any, opcoes: any)=> rota(String(url), opcoes))
  globalThis.fetch = falso as any
  return falso
}

function mutacao(id: string, extra: any = {}){
  return {
    id,
    tipo: 'CONFIRMAR_ENTREGA',
    caminho: '/orders/' + id + '/delivery-confirmation',
    corpo: JSON.stringify({jti: 'qr-' + id}),
    idempotency_key: 'chave-' + id,
    jti: 'qr-' + id,
    lido_em: Date.now(),
    tentativas: 0,
    ...extra,
  }
}

function pullVazio(url: string){
  if(url.includes('/sync/pull')) return json({changes: {}, timestamp: 1})
  return null
}

async function esperar(condicao: ()=> boolean){
  for(let i = 0; i < 50 && !condicao(); i++){
    await new Promise(r => setTimeout(r, 5))
  }
}

beforeEach(async ()=>{
  await zerarBanco()
  await salvarTokens('access-mock-1', 'refresh-mock-1')
  quandoExpirar(jest.fn())
})

afterEach(()=>{
  globalThis.fetch = original
})

describe('fila de mutacoes', ()=>{
  it('envia as mutacoes na ordem em que foram gravadas', async ()=>{
    const ordem: string[] = []
    usarFetch((url)=>{
      ordem.push(url)
      return json({ok: true})
    })
    await salvar('pending_mutations', mutacao('z'))
    await salvar('pending_mutations', mutacao('a'))
    await salvar('pending_mutations', mutacao('m'))
    await enviarFila()
    expect(ordem.map(u => u.split('/orders/')[1].split('/')[0])).toEqual(['z', 'a', 'm'])
    expect(await contar('pending_mutations')).toBe(0)
  })

  it('manda a chave de idempotencia de cada mutacao com o corpo certo', async ()=>{
    const falso = usarFetch(()=> json({ok: true}))
    await salvar('pending_mutations', mutacao('x1'))
    await salvar('pending_mutations', mutacao('x2'))
    await enviarFila()
    const chaves = falso.mock.calls.map((c: any)=> c[1].headers['Idempotency-Key'])
    expect(chaves).toEqual(['chave-x1', 'chave-x2'])
    expect(falso.mock.calls[0][1].method).toBe('POST')
    expect(falso.mock.calls[0][1].body).toBe(JSON.stringify({jti: 'qr-x1'}))
  })

  it('idempotency in progress mantem o item sem somar tentativa', async ()=>{
    usarFetch(()=> json({code: 'IDEMPOTENCY_IN_PROGRESS'}, 409, {'Retry-After': '2'}))
    await salvar('pending_mutations', mutacao('p1', {tentativas: 2}))
    await enviarFila()
    const m: any = await buscar('pending_mutations', 'p1')
    expect(m).not.toBeNull()
    expect(m.tentativas).toBe(2)
  })

  it('idempotency key reused tira o item da fila', async ()=>{
    usarFetch(()=> json({code: 'IDEMPOTENCY_KEY_REUSED'}, 422))
    await salvar('pending_mutations', mutacao('r1'))
    await enviarFila()
    expect(await buscar('pending_mutations', 'r1')).toBeNull()
  })

  it('resposta repetida com sucesso (replayed) tira o item da fila', async ()=>{
    usarFetch(()=> json({ok: true}, 200, {'Idempotent-Replayed': 'true'}))
    await salvar('pending_mutations', mutacao('rp'))
    await enviarFila()
    expect(await contar('pending_mutations')).toBe(0)
  })

  it('item que falhou continua na mesma posicao da fila', async ()=>{
    await salvar('pending_mutations', mutacao('p1', {lido_em: 1000}))
    await salvar('pending_mutations', mutacao('p2', {lido_em: 2000}))
    await salvar('pending_mutations', mutacao('p3', {lido_em: 3000}))
    usarFetch((url)=> url.includes('/p1/') ? json({code: 'ERRO'}, 500) : json({code: 'IDEMPOTENCY_IN_PROGRESS'}, 409))
    await enviarFila()
    const fila: any = await listar('pending_mutations')
    expect(fila.map((m: any)=> m.id)).toEqual(['p1', 'p2', 'p3'])
  })

  it('erro 500 soma tentativa e segue para o proximo item', async ()=>{
    usarFetch((url)=> url.includes('/e1/') ? json({code: 'ERRO'}, 500) : json({ok: true}))
    await salvar('pending_mutations', mutacao('e1'))
    await salvar('pending_mutations', mutacao('e2'))
    await enviarFila()
    const e1: any = await buscar('pending_mutations', 'e1')
    expect(e1.tentativas).toBe(1)
    expect(await buscar('pending_mutations', 'e2')).toBeNull()
  })

  it('401 com refresh invalido para a fila e nao soma tentativa', async ()=>{
    const aoExpirar = jest.fn()
    quandoExpirar(aoExpirar)
    const falso = usarFetch((url)=>{
      if(url.includes('/auth/refresh')) return json({}, 401)
      return json({}, 401)
    })
    await salvar('pending_mutations', mutacao('u1'))
    await salvar('pending_mutations', mutacao('u2'))
    await enviarFila()
    const chamadasEntrega = falso.mock.calls.filter((c: any)=> String(c[0]).includes('delivery-confirmation'))
    expect(chamadasEntrega.length).toBe(1)
    expect(aoExpirar).toHaveBeenCalled()
    expect(await contar('pending_mutations')).toBe(2)
    const u1: any = await buscar('pending_mutations', 'u1')
    const u2: any = await buscar('pending_mutations', 'u2')
    expect(u1.tentativas).toBe(0)
    expect(u2.tentativas).toBe(0)
  })

  it('401 com refresh valido renova e reenvia a mutacao', async ()=>{
    let entregas = 0
    usarFetch((url)=>{
      if(url.includes('/auth/refresh')) return json({accessToken: 'novo-a', refreshToken: 'novo-r'})
      entregas++
      return entregas == 1 ? json({}, 401) : json({ok: true})
    })
    await salvar('pending_mutations', mutacao('rf'))
    await enviarFila()
    expect(entregas).toBe(2)
    expect(await contar('pending_mutations')).toBe(0)
    expect(await lerAccess()).toBe('novo-a')
  })

  it('erro de rede no meio da fila para e mantem o resto', async ()=>{
    const falso = usarFetch((url)=>{
      if(url.includes('/n2/')) throw new Error('sem rede')
      return json({ok: true})
    })
    await salvar('pending_mutations', mutacao('n1'))
    await salvar('pending_mutations', mutacao('n2'))
    await salvar('pending_mutations', mutacao('n3'))
    await enviarFila()
    expect(await buscar('pending_mutations', 'n1')).toBeNull()
    const n2: any = await buscar('pending_mutations', 'n2')
    const n3: any = await buscar('pending_mutations', 'n3')
    expect(n2.tentativas).toBe(0)
    expect(n3.tentativas).toBe(0)
    expect(falso.mock.calls.length).toBe(2)
  })

  it('fila vazia nao chama a rede', async ()=>{
    const falso = usarFetch(()=> json({}))
    await enviarFila()
    expect(falso).not.toHaveBeenCalled()
  })
})

describe('baixar mudancas', ()=>{
  const agora = Date.now()

  it('aplica created, updated e deleted nas 3 tabelas', async ()=>{
    await salvar('routes', {id: 'r-velha', expira_em: agora + HORA})
    await salvar('routes', {id: 'r-upd', polyline: 'antiga', expira_em: agora + HORA})
    await salvar('appointments', {id: 'a-velho', expira_em: agora + HORA})
    await salvar('appointments', {id: 'a-upd', status: 'PENDENTE', expira_em: agora + HORA})
    await salvar('meeting_points', {id: 'p-velho', expira_em: agora + HORA})
    await salvar('meeting_points', {id: 'p-upd', nome: 'Antigo', expira_em: agora + HORA})
    usarFetch(()=> json({
      changes: {
        routes: {created: [{id: 'r-novo', polyline: 'abc'}], updated: [{id: 'r-upd', polyline: 'nova'}], deleted: ['r-velha']},
        appointments: {created: [{id: 'a-novo', status: 'AGENDADO'}], updated: [{id: 'a-upd', status: 'CONFIRMADO'}], deleted: ['a-velho']},
        meeting_points: {created: [{id: 'p-novo', nome: 'Praca'}], updated: [{id: 'p-upd', nome: 'Novo'}], deleted: ['p-velho']},
      },
      timestamp: 999,
    }))
    await baixarMudancas()
    const rotas: any[] = await listar('routes')
    const consultas: any[] = await listar('appointments')
    const pontos: any[] = await listar('meeting_points')
    expect(rotas.map(r => r.id).sort()).toEqual(['r-novo', 'r-upd'])
    expect(consultas.map(r => r.id).sort()).toEqual(['a-novo', 'a-upd'])
    expect(pontos.map(r => r.id).sort()).toEqual(['p-novo', 'p-upd'])
    expect((await buscar('routes', 'r-upd') as any).polyline).toBe('nova')
    expect((await buscar('appointments', 'a-upd') as any).status).toBe('CONFIRMADO')
    expect((await buscar('meeting_points', 'p-upd') as any).nome).toBe('Novo')
    expect(await lerInfo('ultimo_pull')).toBe('999')
  })

  it('registro sem expira_em ganha a validade da tabela', async ()=>{
    usarFetch(()=> json({
      changes: {
        routes: {created: [{id: 'r1'}]},
        appointments: {created: [{id: 'a1'}]},
        meeting_points: {created: [{id: 'p1'}]},
      },
      timestamp: 1,
    }))
    const antes = Date.now()
    await baixarMudancas()
    const r: any = await buscar('routes', 'r1')
    const a: any = await buscar('appointments', 'a1')
    const p: any = await buscar('meeting_points', 'p1')
    expect(r.expira_em).toBeGreaterThanOrEqual(antes + 24 * HORA)
    expect(a.expira_em).toBeGreaterThanOrEqual(antes + HORA)
    expect(a.expira_em).toBeLessThan(antes + 2 * HORA)
    expect(p.expira_em).toBeGreaterThanOrEqual(antes + 7 * 24 * HORA)
  })

  it('mantem o expira_em que veio do servidor', async ()=>{
    const fixo = agora + 5 * 60 * 1000
    usarFetch(()=> json({changes: {routes: {created: [{id: 'r1', expira_em: fixo}]}}, timestamp: 1}))
    await baixarMudancas()
    expect((await buscar('routes', 'r1') as any).expira_em).toBe(fixo)
  })

  it('o segundo pull manda o lastPulledAt do primeiro timestamp', async ()=>{
    const falso = usarFetch(()=> json({changes: {}, timestamp: 5555}))
    await baixarMudancas()
    await baixarMudancas()
    expect(String(falso.mock.calls[0][0])).toContain('lastPulledAt=0')
    expect(String(falso.mock.calls[1][0])).toContain('lastPulledAt=5555')
  })

  it('erro 500 no pull lanca e nao guarda o horario', async ()=>{
    usarFetch(()=> json({detail: 'falhou'}, 500))
    await expect(baixarMudancas()).rejects.toThrow('falhou')
    expect(await lerInfo('ultimo_pull')).toBeNull()
  })

  it('erro 500 no pull preserva o horario anterior', async ()=>{
    await salvarInfo('ultimo_pull', '777')
    usarFetch(()=> json({}, 500))
    await expect(baixarMudancas()).rejects.toThrow()
    expect(await lerInfo('ultimo_pull')).toBe('777')
  })

  it('resposta sem changes nao quebra e nao apaga nada', async ()=>{
    await salvar('routes', {id: 'r1', expira_em: agora + HORA})
    usarFetch(()=> json({timestamp: 3}))
    await baixarMudancas()
    expect(await contar('routes')).toBe(1)
    expect(await lerInfo('ultimo_pull')).toBe('3')
  })

  it('tabelas desconhecidas em changes sao ignoradas', async ()=>{
    usarFetch(()=> json({changes: {usuarios: {created: [{id: 'x'}]}}, timestamp: 1}))
    await expect(baixarMudancas()).resolves.toBeUndefined()
  })
})

describe('sincronizar', ()=>{
  it('chamadas concorrentes rodam so uma vez', async ()=>{
    const falso = usarFetch((url)=> pullVazio(url) || json({ok: true}))
    await Promise.all([sincronizar(), sincronizar(), sincronizar()])
    const pulls = falso.mock.calls.filter((c: any)=> String(c[0]).includes('/sync/pull'))
    expect(pulls.length).toBe(1)
  })

  it('depois de terminar permite sincronizar de novo', async ()=>{
    const falso = usarFetch((url)=> pullVazio(url) || json({ok: true}))
    await sincronizar()
    await sincronizar()
    const pulls = falso.mock.calls.filter((c: any)=> String(c[0]).includes('/sync/pull'))
    expect(pulls.length).toBe(2)
  })

  it('libera a trava mesmo quando o pull falha', async ()=>{
    usarFetch(()=> json({detail: 'x'}, 500))
    await expect(sincronizar()).rejects.toThrow()
    const falso = usarFetch((url)=> pullVazio(url) || json({}))
    await sincronizar()
    expect(falso).toHaveBeenCalled()
  })

  it('envia a fila antes de baixar e tira os vencidos no fim', async ()=>{
    const ordem: string[] = []
    usarFetch((url)=>{
      ordem.push(url.includes('/sync/pull') ? 'pull' : 'envio')
      return pullVazio(url) || json({ok: true})
    })
    await salvar('pending_mutations', mutacao('s1'))
    await salvar('routes', {id: 'vencida', expira_em: Date.now() - 1000})
    await salvar('routes', {id: 'valida', expira_em: Date.now() + HORA})
    await sincronizar()
    expect(ordem).toEqual(['envio', 'pull'])
    expect((await listar('routes') as any[]).map(r => r.id)).toEqual(['valida'])
  })

  it('segue para o pull mesmo com a fila parada por erro de rede', async ()=>{
    const falso = usarFetch((url)=>{
      if(url.includes('/sync/pull')) return json({changes: {}, timestamp: 1})
      throw new Error('sem rede')
    })
    await salvar('pending_mutations', mutacao('s1'))
    await sincronizar()
    expect(falso.mock.calls.some((c: any)=> String(c[0]).includes('/sync/pull'))).toBe(true)
    expect(await contar('pending_mutations')).toBe(1)
  })
})

describe('tirarVencidos', ()=>{
  it('remove so os vencidos de cada tabela', async ()=>{
    const passado = Date.now() - 1000
    const futuro = Date.now() + HORA
    for(const t of ['routes', 'appointments', 'meeting_points']){
      await salvar(t, {id: 'velho', expira_em: passado})
      await salvar(t, {id: 'novo', expira_em: futuro})
    }
    await salvar('pending_mutations', mutacao('fila'))
    await tirarVencidos()
    for(const t of ['routes', 'appointments', 'meeting_points']){
      expect((await listar(t) as any[]).map(r => r.id)).toEqual(['novo'])
    }
    expect(await contar('pending_mutations')).toBe(1)
  })

  it('nao mexe em banco vazio', async ()=>{
    await expect(tirarVencidos()).resolves.toBeUndefined()
  })
})

describe('ligarSincronizacao', ()=>{
  let ouvinte: any
  let desligar: any

  beforeEach(()=>{
    ouvinte = null
    desligar = jest.fn()
    ;(NetInfo.addEventListener as jest.Mock).mockReset()
    ;(NetInfo.addEventListener as jest.Mock).mockImplementation((f: any)=>{
      ouvinte = f
      return desligar
    })
  })

  function pulls(falso: any){
    return falso.mock.calls.filter((c: any)=> String(c[0]).includes('/sync/pull')).length
  }

  it('sincroniza na transicao offline para online', async ()=>{
    const falso = usarFetch((url)=> pullVazio(url) || json({}))
    ligarSincronizacao()
    ouvinte({isConnected: false})
    expect(pulls(falso)).toBe(0)
    ouvinte({isConnected: true})
    await esperar(()=> pulls(falso) > 0)
    expect(pulls(falso)).toBe(1)
  })

  it('nao sincroniza de online para online', async ()=>{
    const falso = usarFetch((url)=> pullVazio(url) || json({}))
    ligarSincronizacao()
    ouvinte({isConnected: true})
    ouvinte({isConnected: true})
    await new Promise(r => setTimeout(r, 50))
    expect(pulls(falso)).toBe(0)
  })

  it('nao sincroniza de online para offline', async ()=>{
    const falso = usarFetch((url)=> pullVazio(url) || json({}))
    ligarSincronizacao()
    ouvinte({isConnected: false})
    await new Promise(r => setTimeout(r, 50))
    expect(pulls(falso)).toBe(0)
  })

  it('sincroniza de novo a cada volta da internet', async ()=>{
    const falso = usarFetch((url)=> pullVazio(url) || json({}))
    ligarSincronizacao()
    ouvinte({isConnected: false})
    ouvinte({isConnected: true})
    await esperar(()=> pulls(falso) == 1)
    await new Promise(r => setTimeout(r, 20))
    ouvinte({isConnected: false})
    ouvinte({isConnected: true})
    await esperar(()=> pulls(falso) == 2)
    expect(pulls(falso)).toBe(2)
  })

  it('isConnected nulo conta como offline', async ()=>{
    const falso = usarFetch((url)=> pullVazio(url) || json({}))
    ligarSincronizacao()
    ouvinte({isConnected: null})
    ouvinte({isConnected: true})
    await esperar(()=> pulls(falso) > 0)
    expect(pulls(falso)).toBe(1)
  })

  it('erro na sincronizacao nao vira excecao solta', async ()=>{
    const falso = usarFetch(()=> json({detail: 'x'}, 500))
    ligarSincronizacao()
    ouvinte({isConnected: false})
    ouvinte({isConnected: true})
    await esperar(()=> falso.mock.calls.length > 0)
    await new Promise(r => setTimeout(r, 20))
    expect(falso).toHaveBeenCalled()
  })

  it('devolve a funcao que cancela o ouvinte', ()=>{
    const retorno = ligarSincronizacao()
    expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1)
    retorno()
    expect(desligar).toHaveBeenCalledTimes(1)
  })
})

describe('limpeza e seguranca dos dados', ()=>{
  it('limparAparelho apaga todas as tabelas, o sync_info e as chaves', async ()=>{
    await salvar('routes', {id: 'r1', expira_em: Date.now() + HORA})
    await salvar('appointments', {id: 'a1', expira_em: Date.now() + HORA})
    await salvar('meeting_points', {id: 'p1', expira_em: Date.now() + HORA})
    await salvar('pending_mutations', mutacao('m1'))
    await salvarInfo('ultimo_pull', '123')
    await limparAparelho()
    expect(await contar('routes')).toBe(0)
    expect(await contar('appointments')).toBe(0)
    expect(await contar('meeting_points')).toBe(0)
    expect(await contar('pending_mutations')).toBe(0)
    expect(await lerInfo('ultimo_pull')).toBeNull()
    expect(await lerAccess()).toBeNull()
    expect(await lerRefresh()).toBeNull()
  })

  it('depois de limpar o proximo pull comeca do zero', async ()=>{
    await salvarInfo('ultimo_pull', '123')
    await limparAparelho()
    const falso = usarFetch(()=> json({changes: {}, timestamp: 9}))
    await baixarMudancas()
    expect(String(falso.mock.calls[0][0])).toContain('lastPulledAt=0')
  })

  it('guarda aspas, acentos e unicode sem quebrar o SQL', async ()=>{
    const textos = [
      "O'Brien",
      "'; DROP TABLE routes; --",
      '" OR 1=1 --',
      'Praça São João, açaí e coração',
      '日本語 🚚📦 مرحبا',
      'linha1\nlinha2\t%_\\',
    ]
    for(let i = 0; i < textos.length; i++){
      await salvar('meeting_points', {id: 'p' + i, nome: textos[i], endereco: textos[i]})
    }
    for(let i = 0; i < textos.length; i++){
      const p: any = await buscar('meeting_points', 'p' + i)
      expect(p.nome).toBe(textos[i])
      expect(p.endereco).toBe(textos[i])
    }
    expect(await contar('routes')).toBe(0)
    expect(await contar('meeting_points')).toBe(textos.length)
  })

  it('id com SQL malicioso e tratado como texto', async ()=>{
    const id = "x'; DELETE FROM meeting_points; --"
    await salvar('meeting_points', {id: 'ok', nome: 'a'})
    await salvar('meeting_points', {id, nome: 'b'})
    expect((await buscar('meeting_points', id) as any).nome).toBe('b')
    expect(await contar('meeting_points')).toBe(2)
  })

  it('corpo da mutacao com json e aspas volta igual', async ()=>{
    const corpo = JSON.stringify({jti: "qr'1", nota: 'ação "dupla"'})
    await salvar('pending_mutations', mutacao('j1', {corpo}))
    expect((await buscar('pending_mutations', 'j1') as any).corpo).toBe(corpo)
  })

  it('salvar com is_deleted true esconde do listar', async ()=>{
    await salvar('routes', {id: 'r1', is_deleted: true})
    await salvar('routes', {id: 'r2', is_deleted: false})
    await salvar('routes', {id: 'r3'})
    expect((await listar('routes') as any[]).map(r => r.id).sort()).toEqual(['r2', 'r3'])
    expect((await buscar('routes', 'r1') as any).is_deleted).toBe(1)
  })

  it('salvar de novo o mesmo id substitui o registro', async ()=>{
    await salvar('routes', {id: 'r1', polyline: 'a'})
    await salvar('routes', {id: 'r1', polyline: 'b'})
    expect(await contar('routes')).toBe(1)
    expect((await buscar('routes', 'r1') as any).polyline).toBe('b')
  })

  it('buscar id que nao existe devolve nulo', async ()=>{
    expect(await buscar('routes', 'nada')).toBeNull()
  })

  it('item marcado como deletado nao e enviado pela fila', async ()=>{
    const falso = usarFetch(()=> json({ok: true}))
    await salvar('pending_mutations', mutacao('d1', {is_deleted: true}))
    await enviarFila()
    expect(falso).not.toHaveBeenCalled()
  })
})
