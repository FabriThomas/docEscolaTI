import { render, screen, fireEvent, waitFor } from '@testing-library/react-native'
import MeusAnuncios from '../app/anuncios/index'
import { RascunhoProvider } from '../src/RascunhoContext'
import { resetarMock } from '../src/mock'

const mockPush = jest.fn()
jest.mock('expo-router', ()=>{
  const React = require('react')
  return {
    useRouter: ()=> ({push: mockPush, replace: jest.fn(), back: jest.fn()}),
    useFocusEffect: (cb: any)=> React.useEffect(()=>{ cb() }, []),
  }
})

beforeEach(()=>{
  resetarMock()
  jest.clearAllMocks()
})

async function abrir(){
  await render(<RascunhoProvider><MeusAnuncios/></RascunhoProvider>)
  await screen.findByText('Placa de vídeo genérica 8GB')
}

it('lista os anuncios com o status', async ()=>{
  await abrir()
  expect(screen.getByText('Kit memória 16GB DDR4')).toBeTruthy()
  expect(screen.getAllByText('Ativo').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Pausado').length).toBeGreaterThan(0)
})

it('filtro mostra so os pausados', async ()=>{
  await abrir()
  await fireEvent.press(screen.getByRole('button', {name: 'Filtrar: Pausado'}))
  expect(screen.getByText('Kit memória 16GB DDR4')).toBeTruthy()
  expect(screen.queryByText('Placa de vídeo genérica 8GB')).toBeNull()
})

it('pausar pede o motivo e muda o status', async ()=>{
  await abrir()
  await fireEvent.press(screen.getByRole('button', {name: 'Pausar Placa de vídeo genérica 8GB'}))
  expect(screen.getByText('2 propostas em aberto · 5 conversas')).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', {name: 'Confirmar pausa'}))
  expect(screen.getByText('Informe o motivo')).toBeTruthy()
  await fireEvent.changeText(screen.getByLabelText('Motivo da pausa'), 'Vou viajar')
  await fireEvent.press(screen.getByRole('button', {name: 'Confirmar pausa'}))
  await waitFor(()=> expect(screen.getByRole('button', {name: 'Reabrir Placa de vídeo genérica 8GB'})).toBeTruthy())
})

it('nao pausa com encontro agendado (STY019 RN01)', async ()=>{
  await abrir()
  await fireEvent.press(screen.getByRole('button', {name: 'Pausar Processador 6 núcleos + cooler'}))
  await fireEvent.changeText(screen.getByLabelText('Motivo da pausa'), 'Vou viajar')
  await fireEvent.press(screen.getByRole('button', {name: 'Confirmar pausa'}))
  expect(await screen.findByText(/encontro agendado/)).toBeTruthy()
})

it('reabrir pausado manda pra analise de novo (STY019 RN05)', async ()=>{
  await abrir()
  await fireEvent.press(screen.getByRole('button', {name: 'Reabrir Kit memória 16GB DDR4'}))
  await fireEvent.press(screen.getByRole('button', {name: 'Confirmar reabertura'}))
  await waitFor(()=> expect(screen.getAllByText('Em análise').length).toBeGreaterThan(1))
})

it('removido pela moderacao nao tem botao de reabrir (STY019 RN04)', async ()=>{
  await abrir()
  expect(screen.getByText('Removido pela moderação: Fotos de outro anúncio')).toBeTruthy()
  expect(screen.queryByRole('button', {name: 'Reabrir Fonte 500W'})).toBeNull()
})

it('expirado ha mais de 30 dias so deixa criar um novo com os dados (STY019 RN06)', async ()=>{
  await abrir()
  expect(screen.queryByRole('button', {name: 'Reabrir Gabinete mid tower'})).toBeNull()
  await fireEvent.press(screen.getByRole('button', {name: 'Criar novo com os dados de Gabinete mid tower'}))
  expect(mockPush).toHaveBeenCalledWith('/anunciar/fotos')
})

it('excluir tira o anuncio da lista', async ()=>{
  await abrir()
  await fireEvent.press(screen.getByRole('button', {name: 'Excluir Kit memória 16GB DDR4'}))
  await fireEvent.press(screen.getByRole('button', {name: 'Sim, excluir'}))
  await waitFor(()=> expect(screen.queryByText('Kit memória 16GB DDR4')).toBeNull())
})
