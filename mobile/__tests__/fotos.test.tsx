import { render, screen, fireEvent, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'
import Fotos from '../app/anunciar/fotos'
import { RascunhoProvider, rascunhoVazio, useRascunho } from '../src/RascunhoContext'
import { resetarMock, mudarCenarioScanner } from '../src/mock'

const mockPush = jest.fn()
jest.mock('expo-router', ()=> ({ useRouter: ()=> ({push: mockPush, back: jest.fn()}) }))

jest.mock('expo-image-picker', ()=> ({
  requestMediaLibraryPermissionsAsync: jest.fn(async ()=> ({granted: true, canAskAgain: true})),
  launchImageLibraryAsync: jest.fn(),
  getPendingResultAsync: jest.fn(async ()=> null),
}))

beforeEach(()=>{
  resetarMock()
  jest.clearAllMocks()
})

function Espiao(){
  const {anuncio} = useRascunho()
  return <Text testID="espiao">{JSON.stringify(anuncio)}</Text>
}

function lerRascunho(){
  return JSON.parse(screen.getByTestId('espiao').props.children)
}

const foto = (id: string)=> ({id: id, uri: 'file://' + id + '.webp', largura: 1600, altura: 1200, bytes: 200000})

async function abrir(fotos: any[]){
  await render(<RascunhoProvider inicial={{...rascunhoVazio, fotos: fotos}}><Fotos/><Espiao/></RascunhoProvider>)
}

it('sem foto o continuar fica desabilitado', async ()=>{
  await abrir([])
  expect(screen.getByRole('button', {name: 'Continuar'})).toBeDisabled()
})

it('com 6 fotos nao deixa adicionar mais', async ()=>{
  await abrir([1, 2, 3, 4, 5, 6].map(n => foto('f' + n)))
  expect(screen.getByRole('button', {name: 'Adicionar foto'})).toBeDisabled()
})

it('scanner com confianca alta preenche e da moedas', async ()=>{
  mudarCenarioScanner('AUTO_L5')
  await abrir([foto('f1')])
  await fireEvent.press(screen.getByRole('button', {name: 'Usar o Scanner IA'}))
  await waitFor(()=> expect(lerRascunho().titulo).toBe('Placa de vídeo genérica 8GB'))
  expect(lerRascunho().ganhaMoedas).toBe(true)
  expect(lerRascunho().origem.titulo).toBe('IA')
})

it('scanner em duvida mostra so 3 opcoes com score bom (STY017 RN03)', async ()=>{
  mudarCenarioScanner('TOP3_HYPOTHESES')
  await abrir([foto('f1')])
  await fireEvent.press(screen.getByRole('button', {name: 'Usar o Scanner IA'}))
  expect(await screen.findByText('Qual dessas é a sua peça?')).toBeTruthy()
  expect(screen.queryByRole('button', {name: 'Processador 4 núcleos'})).toBeNull()
  await fireEvent.press(screen.getByRole('button', {name: 'Processador 6 núcleos geração 2'}))
  expect(lerRascunho().titulo).toBe('Processador 6 núcleos geração 2')
  expect(lerRascunho().ganhaMoedas).toBe(true)
})

it('curadoria nao da moedas e guarda so a categoria (STY017 RN04)', async ()=>{
  mudarCenarioScanner('MANUAL_CURATION')
  await abrir([foto('f1')])
  await fireEvent.press(screen.getByRole('button', {name: 'Usar o Scanner IA'}))
  expect(await screen.findByText(/curadoria/)).toBeTruthy()
  expect(lerRascunho().categoria).toBe('Placa-mãe')
  expect(lerRascunho().ganhaMoedas).toBe(false)
})

it('foto ruim pede pra tirar de novo (STY017 RN02)', async ()=>{
  mudarCenarioScanner('LOW_QUALITY_RECAPTURE')
  await abrir([foto('f1')])
  await fireEvent.press(screen.getByRole('button', {name: 'Usar o Scanner IA'}))
  expect(await screen.findByText('Iluminação insuficiente — tente em um local mais claro')).toBeTruthy()
})

it('scanner fora do ar deixa preencher na mao', async ()=>{
  mudarCenarioScanner('FORA')
  await abrir([foto('f1')])
  await fireEvent.press(screen.getByRole('button', {name: 'Usar o Scanner IA'}))
  expect(await screen.findByText(/indisponível/)).toBeTruthy()
})

it('tirar uma foto depois do scanner tira as moedas', async ()=>{
  mudarCenarioScanner('AUTO_L5')
  await abrir([foto('f1'), foto('f2')])
  await fireEvent.press(screen.getByRole('button', {name: 'Usar o Scanner IA'}))
  await waitFor(()=> expect(lerRascunho().ganhaMoedas).toBe(true))
  await fireEvent.press(screen.getByRole('button', {name: 'Remover foto 2'}))
  expect(lerRascunho().ganhaMoedas).toBe(false)
})
