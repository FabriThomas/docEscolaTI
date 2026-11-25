import { URL_API } from '../src/api'
import { resetarMock } from '../src/mock'

beforeEach(()=> resetarMock())

it('o mock responde no formato de erro RFC 9457', async ()=>{
  const res = await fetch(URL_API + '/offers/a2/pause', {method: 'POST', body: JSON.stringify({reason: 'viagem'})})
  const dados = await res.json()
  expect(res.status).toBe(409)
  expect(dados.code).toBe('OFFER_HAS_SCHEDULE')
  expect(dados.detail).toBeTruthy()
})

it('publicar com telefone na descricao e recusado', async ()=>{
  const res = await fetch(URL_API + '/offers', {method: 'POST', body: JSON.stringify({title: 'x', description: 'liga 44 99999-0000', priceCents: 100})})
  const dados = await res.json()
  expect(dados.code).toBe('PII_OR_CONTACT_DETECTED')
})

it('editar com versao velha da conflito', async ()=>{
  const res = await fetch(URL_API + '/offers/a1', {method: 'PATCH', body: JSON.stringify({title: 'novo', version: 99})})
  const dados = await res.json()
  expect(dados.code).toBe('OFFER_VERSION_CONFLICT')
})
