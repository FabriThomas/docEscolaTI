import { render, screen, fireEvent, waitFor } from '@testing-library/react-native'
import Revisao from '../app/anunciar/revisao'
import { RascunhoProvider, rascunhoVazio } from '../src/RascunhoContext'
import { resetarMock } from '../src/mock'

const mockPush = jest.fn()
const mockReplace = jest.fn()
jest.mock('expo-router', ()=> ({ useRouter: ()=> ({push: mockPush, replace: mockReplace, back: jest.fn(), canDismiss: ()=> false, dismissAll: jest.fn()}) }))

beforeEach(()=>{
  resetarMock()
  jest.clearAllMocks()
})

const pronto = {
  ...rascunhoVazio,
  fotos: [{id: 'f1', uri: 'file://f1.webp', largura: 1600, altura: 1200, bytes: 200000}],
  titulo: 'Placa de vídeo genérica 8GB',
  categoria: 'Placa de vídeo',
  tempoUso: '1 a 2 anos',
  estado: 'FUNCIONA',
  precoCents: 165000,
  precoMinimoCents: 145000,
  entrega: 'ENCONTRO',
  bairro: 'Bairro Centro',
}

it('mostra o resumo do anuncio', async ()=>{
  await render(<RascunhoProvider inicial={pronto}><Revisao/></RascunhoProvider>)
  expect(screen.getByText('Placa de vídeo genérica 8GB')).toBeTruthy()
  expect(screen.getByText('R$ 1.650')).toBeTruthy()
  expect(screen.getByText('Aceita a partir de R$ 1.450')).toBeTruthy()
  expect(screen.getByText('Encontro em ponto seguro')).toBeTruthy()
})

it('publicar so libera depois de marcar a declaracao', async ()=>{
  await render(<RascunhoProvider inicial={pronto}><Revisao/></RascunhoProvider>)
  expect(screen.getByRole('button', {name: 'Publicar anúncio'})).toBeDisabled()
  await fireEvent.press(screen.getByRole('checkbox'))
  expect(screen.getByRole('button', {name: 'Publicar anúncio'})).toBeEnabled()
})

it('sem scanner nao mostra moedas', async ()=>{
  await render(<RascunhoProvider inicial={pronto}><Revisao/></RascunhoProvider>)
  expect(screen.queryByText('Você ganha moedas pelo Scanner IA.')).toBeNull()
})

it('com o scanner acima de 80% mostra as moedas (RB-08)', async ()=>{
  await render(<RascunhoProvider inicial={{...pronto, ganhaMoedas: true}}><Revisao/></RascunhoProvider>)
  expect(screen.getByText('Você ganha moedas pelo Scanner IA.')).toBeTruthy()
})

it('publica e volta pra lista', async ()=>{
  await render(<RascunhoProvider inicial={{...pronto, aceite: true}}><Revisao/></RascunhoProvider>)
  await fireEvent.press(screen.getByRole('button', {name: 'Publicar anúncio'}))
  await waitFor(()=> expect(mockReplace).toHaveBeenCalledWith('/anuncios'))
  expect(global.alert).toHaveBeenCalled()
})

it('descricao com telefone mostra o erro de dados pessoais', async ()=>{
  await render(<RascunhoProvider inicial={{...pronto, aceite: true, descricao: 'me chama no 44 99999-0000'}}><Revisao/></RascunhoProvider>)
  await fireEvent.press(screen.getByRole('button', {name: 'Publicar anúncio'}))
  expect(await screen.findByText('Dados pessoais na descrição')).toBeTruthy()
  expect(mockReplace).not.toHaveBeenCalled()
})

it('nao publica rascunho vazio', async ()=>{
  await render(<RascunhoProvider inicial={{...rascunhoVazio, aceite: true}}><Revisao/></RascunhoProvider>)
  await fireEvent.press(screen.getByRole('button', {name: 'Publicar anúncio'}))
  expect(screen.getByText('Faltam dados do anúncio. Volte e preencha as etapas.')).toBeTruthy()
})

it('erro no envio da foto nao aparece como sem conexao', async ()=>{
  const original = globalThis.fetch
  globalThis.fetch = jest.fn(async ()=> new Response('', {status: 500})) as any
  await render(<RascunhoProvider inicial={{...pronto, aceite: true}}><Revisao/></RascunhoProvider>)
  await fireEvent.press(screen.getByRole('button', {name: 'Publicar anúncio'}))
  expect(await screen.findByText('erro ao enviar a foto, tente de novo')).toBeTruthy()
  globalThis.fetch = original
})

it('nao publica item com risco quimico mesmo abrindo a revisao direto', async ()=>{
  await render(<RascunhoProvider inicial={{...pronto, aceite: true, materialPerigoso: true}}><Revisao/></RascunhoProvider>)
  await fireEvent.press(screen.getByRole('button', {name: 'Publicar anúncio'}))
  expect(screen.getByText('Faltam dados do anúncio. Volte e preencha as etapas.')).toBeTruthy()
})
