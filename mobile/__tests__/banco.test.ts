import { salvar, listar, buscar, apagar, contar, zerarBanco, tirarVencidos, expirou, VALIDADE } from '../src/banco'

beforeEach(async ()=>{
  await zerarBanco()
})

it('cria e le um encontro no banco local', async ()=>{
  await salvar('appointments', {id: 'e1', order_id: 'o1', meeting_point_id: 'p1', status: 'AGENDADO', marcado_para: Date.now(), expira_em: Date.now() + VALIDADE.appointments})
  const lista: any[] = await listar('appointments')
  expect(lista).toHaveLength(1)
  expect(lista[0].order_id).toBe('o1')
  expect(lista[0].is_deleted).toBe(0)
  expect(expirou(lista[0])).toBe(false)
})

it('salvar de novo atualiza em vez de duplicar', async ()=>{
  await salvar('meeting_points', {id: 'p1', nome: 'Praça', expira_em: Date.now() + 1000})
  await salvar('meeting_points', {id: 'p1', nome: 'Praça nova', expira_em: Date.now() + 1000})
  expect(await contar('meeting_points')).toBe(1)
  const ponto: any = await buscar('meeting_points', 'p1')
  expect(ponto.nome).toBe('Praça nova')
})

it('registro apagado some da lista', async ()=>{
  await salvar('routes', {id: 'r1', is_deleted: true, expira_em: Date.now() + 1000})
  expect(await listar('routes')).toHaveLength(0)
  await salvar('routes', {id: 'r2', expira_em: Date.now() + 1000})
  await apagar('routes', 'r2')
  expect(await buscar('routes', 'r2')).toBeNull()
  expect(await contar('routes')).toBe(1)
})

it('tira os registros vencidos', async ()=>{
  await salvar('routes', {id: 'velha', expira_em: Date.now() - 1000})
  await salvar('routes', {id: 'nova', expira_em: Date.now() + 60000})
  await tirarVencidos()
  const lista: any[] = await listar('routes')
  expect(lista.map(r => r.id)).toEqual(['nova'])
})

it('validade de cada tabela segue a ADR-23', ()=>{
  expect(VALIDADE.routes).toBe(24 * 3600000)
  expect(VALIDADE.appointments).toBe(3600000)
  expect(VALIDADE.meeting_points).toBe(7 * 24 * 3600000)
})
