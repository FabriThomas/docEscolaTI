import { banco, expirou, VALIDADE } from '../src/banco'

it('cria e le um encontro no banco local', async ()=>{
  await banco.write(async ()=>{
    await banco.get('appointments').create((e: any)=>{
      e.orderId = 'o1'
      e.pontoId = 'p1'
      e.status = 'AGENDADO'
      e.marcadoPara = Date.now()
      e.expiraEm = Date.now() + VALIDADE.appointments
      e.atualizadoEm = Date.now()
      e.apagado = false
    })
  })
  const lista: any[] = await banco.get('appointments').query().fetch()
  expect(lista).toHaveLength(1)
  expect(lista[0].orderId).toBe('o1')
  expect(expirou(lista[0])).toBe(false)
})

it('validade de cada tabela segue a ADR-23', ()=>{
  expect(VALIDADE.routes).toBe(24 * 3600000)
  expect(VALIDADE.appointments).toBe(3600000)
  expect(VALIDADE.meeting_points).toBe(7 * 24 * 3600000)
})
