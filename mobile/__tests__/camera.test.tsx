import { render, screen, fireEvent, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'
import Camera from '../app/anunciar/camera'
import { RascunhoProvider, useRascunho } from '../src/RascunhoContext'
import { prepararFotos } from '../src/foto'

const mockBack = jest.fn()
jest.mock('expo-router', ()=> ({ useRouter: ()=> ({push: jest.fn(), back: mockBack}) }))

let mockPermissao: any = {granted: true}
const mockPedir = jest.fn()
jest.mock('expo-camera', ()=>{
  const React = require('react')
  const { View } = require('react-native')
  return {
    useCameraPermissions: ()=> [mockPermissao, mockPedir],
    CameraView: React.forwardRef((props: any, ref: any)=>{
      React.useImperativeHandle(ref, ()=> ({
        takePictureAsync: async ()=> ({uri: 'file://tirada.jpg', width: 1600, height: 1200, exif: {BrightnessValue: 3}})
      }))
      return React.createElement(View, null, props.children)
    }),
  }
})

jest.mock('../src/foto', ()=> ({
  MAX_FOTOS: 6,
  prepararFotos: jest.fn(),
}))

function Espiao(){
  const {anuncio} = useRascunho()
  return <Text testID="espiao">{anuncio.fotos.length}</Text>
}

beforeEach(()=>{
  mockPermissao = {granted: true}
  jest.clearAllMocks()
})

it('sem permissao mostra o botao pra liberar a camera', async ()=>{
  mockPermissao = {granted: false}
  await render(<RascunhoProvider><Camera/></RascunhoProvider>)
  await fireEvent.press(screen.getByRole('button', {name: 'Permitir câmera'}))
  expect(mockPedir).toHaveBeenCalled()
})

it('mostra a moldura pra enquadrar a peca', async ()=>{
  await render(<RascunhoProvider><Camera/></RascunhoProvider>)
  expect(screen.getByText('Encaixe a peça inteira dentro da moldura')).toBeTruthy()
  expect(screen.getByText(/de 6/)).toBeTruthy()
})

it('foto boa entra no anuncio e volta', async ()=>{
  (prepararFotos as jest.Mock).mockResolvedValue({prontas: [{id: 'f1', uri: 'file://f1.webp', largura: 1600, altura: 1200, bytes: 100000}], erros: []})
  await render(<RascunhoProvider><Camera/><Espiao/></RascunhoProvider>)
  await fireEvent.press(screen.getByRole('button', {name: 'Tirar foto'}))
  await waitFor(()=> expect(mockBack).toHaveBeenCalled())
  expect(screen.getByTestId('espiao').props.children).toBe(1)
})

it('foto escura abre a tela de tirar de novo', async ()=>{
  (prepararFotos as jest.Mock).mockResolvedValue({prontas: [], erros: ['Iluminação insuficiente — tente em um local mais claro']})
  await render(<RascunhoProvider><Camera/></RascunhoProvider>)
  await fireEvent.press(screen.getByRole('button', {name: 'Tirar foto'}))
  expect(await screen.findByText('Iluminação insuficiente — tente em um local mais claro')).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', {name: 'Tirar de novo'}))
  expect(screen.getByText('Encaixe a peça inteira dentro da moldura')).toBeTruthy()
})

it('com 6 fotos a camera nao deixa passar do limite', async ()=>{
  const seis = [1, 2, 3, 4, 5, 6].map(n => ({id: 'f' + n, uri: 'file://f' + n + '.webp', largura: 1600, altura: 1200, bytes: 100000}))
  await render(<RascunhoProvider inicial={{fotos: seis}}><Camera/><Espiao/></RascunhoProvider>)
  await fireEvent.press(screen.getByRole('button', {name: 'Tirar foto'}))
  expect(prepararFotos).not.toHaveBeenCalled()
  expect(mockBack).toHaveBeenCalled()
  expect(screen.getByTestId('espiao').props.children).toBe(6)
})
