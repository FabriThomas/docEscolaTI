import { render, screen, fireEvent } from '@testing-library/react-native'
import { Text } from 'react-native'
import Preco from '../app/anunciar/preco'
import { RascunhoProvider, rascunhoVazio, useRascunho } from '../src/RascunhoContext'

const mockPush = jest.fn()
jest.mock('expo-router', ()=> ({ useRouter: ()=> ({push: mockPush, back: jest.fn()}) }))

beforeEach(()=> jest.clearAllMocks())

function Espiao(){
  const {anuncio} = useRascunho()
  return <Text testID="espiao">{JSON.stringify(anuncio)}</Text>
}

function lerRascunho(){
  return JSON.parse(screen.getByTestId('espiao').props.children)
}

async function abrir(){
  await render(<RascunhoProvider inicial={{...rascunhoVazio, categoria: 'Placa de vídeo', titulo: 'Placa de vídeo genérica 8GB'}}><Preco/><Espiao/></RascunhoProvider>)
}

async function preencher(preco: string){
  await fireEvent.changeText(screen.getByLabelText('Preço'), preco)
  await fireEvent.press(screen.getByRole('radio', {name: /Encontro em ponto seguro/}))
  await fireEvent.changeText(screen.getByLabelText('Localização aproximada'), 'Bairro Centro')
}

it('guarda o preco em centavos e vai pra revisao', async ()=>{
  await abrir()
  await screen.findByText('R$ 1.550 – 1.800')
  await preencher('1.650')
  await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
  expect(lerRascunho().precoCents).toBe(165000)
  expect(lerRascunho().entrega).toBe('ENCONTRO')
  expect(mockPush).toHaveBeenCalledWith('/anunciar/revisao')
})

it('campos vazios ficam marcados', async ()=>{
  await abrir()
  await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
  expect(screen.getAllByText('Campo obrigatório')).toHaveLength(3)
  expect(mockPush).not.toHaveBeenCalled()
})

it('avisa quando o preco esta dentro da referencia', async ()=>{
  await abrir()
  await screen.findByText('R$ 1.550 – 1.800')
  await fireEvent.changeText(screen.getByLabelText('Preço'), '1.650')
  expect(screen.getByText('Seu preço está dentro da faixa das últimas negociações.')).toBeTruthy()
})

it('preco muito longe da referencia pede confirmacao (STY016 RN04)', async ()=>{
  await abrir()
  await screen.findByText('R$ 1.550 – 1.800')
  await preencher('400')
  await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
  expect(screen.getByText(/risco de anúncio fraudulento/)).toBeTruthy()
  expect(mockPush).not.toHaveBeenCalled()
  await fireEvent.press(screen.getByRole('button', {name: 'Manter preço'}))
  expect(mockPush).toHaveBeenCalledWith('/anunciar/revisao')
})

it('minimo maior que o preco da erro', async ()=>{
  await abrir()
  await preencher('100')
  await fireEvent.changeText(screen.getByLabelText('Mínimo aceito'), '200')
  await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
  expect(screen.getByText('O mínimo não pode ser maior que o preço')).toBeTruthy()
})

it('desligar propostas esconde o minimo', async ()=>{
  await abrir()
  await fireEvent(screen.getByRole('switch', {name: 'Aceitar propostas'}), 'valueChange', false)
  expect(screen.queryByLabelText('Mínimo aceito')).toBeNull()
  expect(lerRascunho().aceitaPropostas).toBe(false)
})

it('avisa que o comprador so ve o bairro (RB-06)', async ()=>{
  await abrir()
  expect(screen.getByText('Os compradores veem só o bairro, nunca o seu endereço.')).toBeTruthy()
})

it('minimo digitado errado nao some sem avisar', async ()=>{
  await abrir()
  await preencher('100')
  await fireEvent.changeText(screen.getByLabelText('Mínimo aceito'), '1,5,5')
  await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
  expect(screen.getByText('Mínimo inválido')).toBeTruthy()
  expect(mockPush).not.toHaveBeenCalled()
})
