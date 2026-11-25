import { ImageManipulator } from 'expo-image-manipulator'
import { validarFoto, comprimirFoto, prepararFotos } from '../src/foto'

let mockTamanhos: number[] = []

jest.mock('expo-image-manipulator', ()=>{
  const contexto: any = {}
  contexto.resize = jest.fn(()=> contexto)
  contexto.renderAsync = jest.fn(async ()=> ({
    saveAsync: jest.fn(async ()=> ({uri: 'file://comprimida.webp', width: 1600, height: 1200}))
  }))
  return {
    ImageManipulator: {manipulate: jest.fn(()=> contexto)},
    SaveFormat: {WEBP: 'webp'}
  }
})

jest.mock('expo-file-system', ()=> ({
  File: jest.fn().mockImplementation(()=> ({ get size(){ return mockTamanhos.shift() } }))
}))

beforeEach(()=> jest.clearAllMocks())

describe('validarFoto', ()=>{
  it('aceita foto boa', ()=>{
    expect(validarFoto(1600, 1200, 900000, 'image/jpeg', 3)).toBe('')
  })

  it('recusa formato que nao e imagem aceita', ()=>{
    expect(validarFoto(1600, 1200, 900000, 'image/gif')).toBe('Formato não aceito. Use JPG, PNG ou HEIC.')
  })

  it('recusa foto maior que 5 MB', ()=>{
    expect(validarFoto(1600, 1200, 6 * 1024 * 1024)).toBe('A foto passa de 5 MB. Escolha outra.')
  })

  it('recusa proporcao muito esticada', ()=>{
    expect(validarFoto(3000, 1000)).toBe('Enquadramento inadequado — use proporção padrão')
  })

  it('recusa foto pequena demais', ()=>{
    expect(validarFoto(500, 400)).toBe('Foto com resolução muito baixa. Chegue mais perto da peça.')
  })

  it('recusa foto escura', ()=>{
    expect(validarFoto(1600, 1200, null, null, -4)).toBe('Iluminação insuficiente — tente em um local mais claro')
  })
})

describe('comprimirFoto', ()=>{
  it('salva em webp com no maximo 1600px', async ()=>{
    mockTamanhos = [200 * 1024]
    const r = await comprimirFoto('file://grande.jpg', 4000, 3000)
    const contexto = (ImageManipulator.manipulate as jest.Mock).mock.results[0].value
    expect(contexto.resize).toHaveBeenCalledWith({width: 1600})
    expect(r.bytes).toBeLessThanOrEqual(300 * 1024)
  })

  it('tenta de novo com menos qualidade ate ficar abaixo de 300 KB', async ()=>{
    mockTamanhos = [500 * 1024, 250 * 1024]
    const r = await comprimirFoto('file://grande.jpg', 4000, 3000)
    expect(r.bytes).toBe(250 * 1024)
    expect(ImageManipulator.manipulate).toHaveBeenCalledTimes(2)
  })

  it('da erro se nunca fica leve', async ()=>{
    mockTamanhos = [900 * 1024, 800 * 1024, 700 * 1024, 600 * 1024]
    await expect(comprimirFoto('file://enorme.jpg', 4000, 3000)).rejects.toThrow('foto muito pesada')
  })
})

it('prepararFotos separa as boas das ruins usando o brilho do exif', async ()=>{
  mockTamanhos = [100 * 1024]
  const r = await prepararFotos([
    {uri: 'file://boa.jpg', width: 1600, height: 1200, exif: {BrightnessValue: 4}},
    {uri: 'file://escura.jpg', width: 1600, height: 1200, exif: {BrightnessValue: -5}},
  ])
  expect(r.prontas).toHaveLength(1)
  expect(r.erros).toEqual(['Iluminação insuficiente — tente em um local mais claro'])
})
