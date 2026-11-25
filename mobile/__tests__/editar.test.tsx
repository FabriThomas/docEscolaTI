import { render, screen, fireEvent, waitFor } from '@testing-library/react-native'
import EditarAnuncio from '../app/anuncios/[id]'
import { resetarMock } from '../src/mock'

let mockId = 'a1'
const mockBack = jest.fn()
jest.mock('expo-router', ()=> ({
  useRouter: ()=> ({push: jest.fn(), back: mockBack}),
  useLocalSearchParams: ()=> ({id: mockId}),
}))

beforeEach(()=>{
  resetarMock()
  mockId = 'a1'
  jest.clearAllMocks()
})

it('carrega os dados e salva', async ()=>{
  await render(<EditarAnuncio/>)
  expect(await screen.findByDisplayValue('Placa de vídeo genérica 8GB')).toBeTruthy()
  expect(screen.getByText(/moderação automática de novo/)).toBeTruthy()
  await fireEvent.changeText(screen.getByLabelText('Preço'), '1.500')
  await fireEvent.press(screen.getByRole('button', {name: 'Salvar alterações'}))
  await waitFor(()=> expect(mockBack).toHaveBeenCalled())
})

it('titulo vazio nao salva (STYG RN02)', async ()=>{
  await render(<EditarAnuncio/>)
  await screen.findByDisplayValue('Placa de vídeo genérica 8GB')
  await fireEvent.changeText(screen.getByLabelText('Título'), '')
  await fireEvent.press(screen.getByRole('button', {name: 'Salvar alterações'}))
  expect(screen.getByText('Campo obrigatório')).toBeTruthy()
  expect(mockBack).not.toHaveBeenCalled()
})

it('conflito de versao mostra o botao de ver a versao atual (STYG RN07)', async ()=>{
  await render(<EditarAnuncio/>)
  await screen.findByDisplayValue('Placa de vídeo genérica 8GB')
  await fetch(require('../src/api').URL_API + '/offers/a1', {method: 'PATCH', body: JSON.stringify({title: 'Mudado por outro', version: 1})})
  await fireEvent.press(screen.getByRole('button', {name: 'Salvar alterações'}))
  expect(await screen.findByText('Alguém alterou esse anúncio enquanto você editava.')).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', {name: 'Ver versão atual'}))
  expect(await screen.findByDisplayValue('Mudado por outro')).toBeTruthy()
})

it('id estranho vindo de link nao chama a api', async ()=>{
  mockId = '../../admin'
  await render(<EditarAnuncio/>)
  expect(await screen.findByText('Anúncio não encontrado')).toBeTruthy()
})
