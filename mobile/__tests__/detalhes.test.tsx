import { render, screen, fireEvent } from '@testing-library/react-native'
import Detalhes from '../app/anunciar/detalhes'
import { RascunhoProvider, rascunhoVazio } from '../src/RascunhoContext'

const mockPush = jest.fn()
jest.mock('expo-router', ()=> ({ useRouter: ()=> ({push: mockPush, back: jest.fn()}) }))

beforeEach(()=> jest.clearAllMocks())

const pronto = {...rascunhoVazio, titulo: 'Placa de vídeo genérica 8GB', categoria: 'Placa de vídeo', tempoUso: '1 a 2 anos', estado: 'FUNCIONA'}

it('campos obrigatorios vazios ficam marcados', async ()=>{
  await render(<RascunhoProvider><Detalhes/></RascunhoProvider>)
  await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
  expect(screen.getAllByText('Campo obrigatório')).toHaveLength(4)
  expect(mockPush).not.toHaveBeenCalled()
})

it('com tudo preenchido vai pro preco', async ()=>{
  await render(<RascunhoProvider inicial={pronto}><Detalhes/></RascunhoProvider>)
  await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
  expect(mockPush).toHaveBeenCalledWith('/anunciar/preco')
})

it('mostra os 5 estados de funcionamento', async ()=>{
  await render(<RascunhoProvider><Detalhes/></RascunhoProvider>)
  expect(screen.getByRole('radio', {name: 'Funciona'})).toBeTruthy()
  expect(screen.getByRole('radio', {name: 'Funciona com defeito'})).toBeTruthy()
  expect(screen.getByRole('radio', {name: 'Não funciona e não sei o porquê'})).toBeTruthy()
  expect(screen.getByRole('radio', {name: 'Não funciona por um motivo que eu sei'})).toBeTruthy()
  expect(screen.getByRole('radio', {name: 'Funciona em partes'})).toBeTruthy()
})

it('com defeito exige foto do defeito', async ()=>{
  await render(<RascunhoProvider inicial={{...pronto, estado: 'FUNCIONA_COM_DEFEITO'}}><Detalhes/></RascunhoProvider>)
  await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
  expect(screen.getByText('Adicione pelo menos uma foto do defeito')).toBeTruthy()
  expect(mockPush).not.toHaveBeenCalled()
})

it('armazenamento pede a situacao dos dados (RB-04)', async ()=>{
  await render(<RascunhoProvider inicial={{...pronto, categoria: 'Armazenamento'}}><Detalhes/></RascunhoProvider>)
  await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
  expect(screen.getByText('Marque uma das opções')).toBeTruthy()
  await fireEvent.press(screen.getByRole('radio', {name: 'Dados removidos'}))
  await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
  expect(mockPush).toHaveBeenCalledWith('/anunciar/preco')
})

it('pc montado tambem pede a situacao dos dados (RB-04)', async ()=>{
  await render(<RascunhoProvider inicial={pronto}><Detalhes/></RascunhoProvider>)
  expect(screen.queryByRole('radio', {name: 'Dados removidos'})).toBeNull()
  await fireEvent.press(screen.getByRole('radio', {name: 'PC Montado'}))
  expect(screen.getByRole('radio', {name: 'Dados removidos'})).toBeTruthy()
})

it('item com risco quimico nao passa e manda pro ecoponto (RB-02)', async ()=>{
  await render(<RascunhoProvider inicial={pronto}><Detalhes/></RascunhoProvider>)
  await fireEvent.press(screen.getByRole('checkbox', {name: /risco químico/}))
  await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
  expect(screen.getByText(/Leve a peça a um Ecoponto/)).toBeTruthy()
  expect(mockPush).not.toHaveBeenCalled()
})
