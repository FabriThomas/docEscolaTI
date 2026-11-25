import { useState } from 'react'
import { Text } from 'react-native'
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native'
import * as ImagePicker from 'expo-image-picker'
import Fotos from '../app/anunciar/fotos'
import Detalhes from '../app/anunciar/detalhes'
import Preco from '../app/anunciar/preco'
import Revisao from '../app/anunciar/revisao'
import MeusAnuncios from '../app/anuncios/index'
import EditarAnuncio from '../app/anuncios/[id]'
import { RascunhoProvider, rascunhoVazio, useRascunho } from '../src/RascunhoContext'
import { resetarMock, mudarCenarioScanner } from '../src/mock'
import { URL_API } from '../src/api'
import { MAX_FOTOS } from '../src/foto'

let mockNavegar: any = null
let mockVoltar: any = null
let mockSubstituir: any = null
let mockId = 'a1'
const mockRotas: string[] = []

jest.mock('expo-router', ()=>{
  const React = require('react')
  return {
    useRouter: ()=> ({
      push: (r: string)=>{ mockRotas.push(r); mockNavegar(r) },
      replace: (r: string)=>{ mockRotas.push(r); mockSubstituir(r) },
      back: ()=>{ mockRotas.push('voltar'); mockVoltar() },
      canDismiss: ()=> false,
      dismissAll: jest.fn(),
    }),
    useFocusEffect: (cb: any)=> React.useEffect(()=>{ cb() }, []),
    useLocalSearchParams: ()=> ({id: mockId}),
  }
})

jest.mock('expo-image-picker', ()=> ({
  requestMediaLibraryPermissionsAsync: jest.fn(async ()=> ({granted: true, canAskAgain: true})),
  launchImageLibraryAsync: jest.fn(),
  getPendingResultAsync: jest.fn(async ()=> null),
}))

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
  File: jest.fn().mockImplementation(()=> ({ get size(){ return 100000 } }))
}))

jest.setTimeout(30000)

const TEMPO = {timeout: 6000}

function Espiao(){
  const {anuncio} = useRascunho()
  return <Text testID="espiao">{JSON.stringify(anuncio)}</Text>
}

function lerRascunho(){
  return JSON.parse(screen.getByTestId('espiao').props.children)
}

function Tela({rota}: {rota: string}){
  if(rota == '/anunciar/fotos') return <Fotos/>
  if(rota == '/anunciar/detalhes') return <Detalhes/>
  if(rota == '/anunciar/preco') return <Preco/>
  if(rota == '/anunciar/revisao') return <Revisao/>
  if(rota == '/anuncios') return <MeusAnuncios/>
  if(rota.startsWith('/anuncios/')){
    mockId = rota.replace('/anuncios/', '')
    return <EditarAnuncio/>
  }
  return <Text>rota desconhecida {rota}</Text>
}

function Navegador({inicio}: {inicio: string}){
  const [pilha, setPilha] = useState([inicio])
  mockNavegar = (r: string)=> setPilha((p)=> [...p, r])
  mockSubstituir = (r: string)=> setPilha([r])
  mockVoltar = ()=> setPilha((p)=> p.length > 1 ? p.slice(0, -1) : p)
  const rota = pilha[pilha.length - 1]
  return <Tela key={rota + pilha.length} rota={rota}/>
}

async function abrir(inicio: string, rascunho: any = rascunhoVazio){
  await render(<RascunhoProvider inicial={rascunho}><Navegador inicio={inicio}/><Espiao/></RascunhoProvider>)
}

const foto = (id: string)=> ({id: id, uri: 'file://' + id + '.webp', largura: 1600, altura: 1200, bytes: 100000})

const asset = (n: number)=> ({uri: 'file://galeria' + n + '.jpg', width: 1600, height: 1200, fileSize: 100000, mimeType: 'image/jpeg'})

const completo = {
  ...rascunhoVazio,
  fotos: [foto('f1')],
  titulo: 'Placa de vídeo genérica 8GB',
  categoria: 'Placa de vídeo',
  tempoUso: '1 a 2 anos',
  estado: 'FUNCIONA',
}

async function escolherOpcao(seletor: string, opcao: string){
  await fireEvent.press(screen.getByRole('button', {name: seletor}))
  await fireEvent.press(screen.getByRole('button', {name: opcao}))
}

async function preencherPreco(valor: string){
  await fireEvent.changeText(screen.getByLabelText('Preço'), valor)
  await fireEvent.press(screen.getByRole('radio', {name: /Encontro em ponto seguro/}))
  await fireEvent.changeText(screen.getByLabelText('Localização aproximada'), 'Bairro Centro')
}

async function irParaRevisao(rascunho: any, preco = '1.650'){
  await abrir('/anunciar/detalhes', rascunho)
  await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
  await screen.findByText(/Forma de entrega/)
  await screen.findByText('R$ 1.550 – 1.800')
  await preencherPreco(preco)
  await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
  await screen.findByText('Revise e publique')
}

function chamadasPublicar(espiao: any){
  return espiao.mock.calls.filter((c: any)=> String(c[0]).endsWith('/offers') && c[1] && c[1].method == 'POST')
}

beforeEach(()=>{
  resetarMock()
  jest.clearAllMocks()
  mockRotas.length = 0
  mockId = 'a1'
})

afterEach(()=>{
  jest.restoreAllMocks()
})

describe('mock sem token nas rotas de anuncio', ()=>{
  it('media, scanner e offers continuam respondendo sem Authorization', async ()=>{
    const a = await fetch(URL_API + '/offers/me')
    expect(a.status).toBe(200)
    const b = await fetch(URL_API + '/scanner/analyze', {method: 'POST', body: JSON.stringify({mediaIds: ['m1']})})
    expect(b.status).toBe(200)
    const c = await fetch(URL_API + '/media', {method: 'POST', body: new FormData()})
    expect(c.status).toBe(201)
    const d = await fetch(URL_API + '/offers/price-reference?category=' + encodeURIComponent('Placa de vídeo') + '&title=x')
    expect(d.status).toBe(200)
    const e = await fetch(URL_API + '/me/profile')
    expect(e.status).toBe(401)
  })
})

describe('fotos', ()=>{
  it('galeria com mais fotos que o limite guarda so 6 e trava o adicionar', async ()=>{
    ;(ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({canceled: false, assets: [1, 2, 3, 4, 5, 6, 7, 8].map(asset)})
    await abrir('/anunciar/fotos')
    await fireEvent.press(screen.getByRole('button', {name: 'Adicionar foto'}))
    await fireEvent.press(screen.getByRole('button', {name: 'Escolher da galeria'}))
    await waitFor(()=> expect(lerRascunho().fotos).toHaveLength(MAX_FOTOS), TEMPO)
    expect(screen.getByRole('button', {name: 'Adicionar foto'})).toBeDisabled()
    expect(screen.getByText('Você chegou no limite de 6 fotos.')).toBeTruthy()
  })

  it('com 5 fotos a galeria so completa ate 6', async ()=>{
    ;(ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({canceled: false, assets: [1, 2, 3].map(asset)})
    await abrir('/anunciar/fotos', {...rascunhoVazio, fotos: [1, 2, 3, 4, 5].map(n => foto('f' + n))})
    await fireEvent.press(screen.getByRole('button', {name: 'Adicionar foto'}))
    await fireEvent.press(screen.getByRole('button', {name: 'Escolher da galeria'}))
    await waitFor(()=> expect(lerRascunho().fotos).toHaveLength(6), TEMPO)
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(expect.objectContaining({selectionLimit: 1}))
  })

  it('foto fora da proporcao e recusada e nao entra no rascunho', async ()=>{
    ;(ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({canceled: false, assets: [{...asset(1), width: 3000, height: 1000}]})
    await abrir('/anunciar/fotos')
    await fireEvent.press(screen.getByRole('button', {name: 'Adicionar foto'}))
    await fireEvent.press(screen.getByRole('button', {name: 'Escolher da galeria'}))
    expect(await screen.findByText('Enquadramento inadequado — use proporção padrão')).toBeTruthy()
    expect(lerRascunho().fotos).toHaveLength(0)
    expect(screen.getByRole('button', {name: 'Continuar'})).toBeDisabled()
  })

  it('botoes de capa e ordem reordenam as fotos', async ()=>{
    await abrir('/anunciar/fotos', {...rascunhoVazio, fotos: [foto('f1'), foto('f2'), foto('f3')]})
    const ids = ()=> lerRascunho().fotos.map((f: any)=> f.id)
    await fireEvent.press(screen.getByRole('button', {name: 'Foto 3'}))
    await fireEvent.press(screen.getByRole('button', {name: 'Definir como capa'}))
    expect(ids()).toEqual(['f3', 'f1', 'f2'])
    await fireEvent.press(screen.getByRole('button', {name: 'Foto 2'}))
    await fireEvent.press(screen.getByRole('button', {name: 'Mover para depois'}))
    expect(ids()).toEqual(['f3', 'f2', 'f1'])
    await fireEvent.press(screen.getByRole('button', {name: 'Mover para antes'}))
    expect(ids()).toEqual(['f3', 'f1', 'f2'])
  })

  it('mover a capa para antes e a ultima para depois nao muda nada', async ()=>{
    await abrir('/anunciar/fotos', {...rascunhoVazio, fotos: [foto('f1'), foto('f2')]})
    const ids = ()=> lerRascunho().fotos.map((f: any)=> f.id)
    await fireEvent.press(screen.getByRole('button', {name: 'Foto 1'}))
    await fireEvent.press(screen.getByRole('button', {name: 'Mover para antes'}))
    expect(ids()).toEqual(['f1', 'f2'])
    await fireEvent.press(screen.getByRole('button', {name: 'Foto 2'}))
    await fireEvent.press(screen.getByRole('button', {name: 'Mover para depois'}))
    expect(ids()).toEqual(['f1', 'f2'])
  })

  it('a capa escolhida chega na revisao e no envio', async ()=>{
    const espiao = jest.spyOn(globalThis, 'fetch')
    await abrir('/anunciar/fotos', {...completo, fotos: [foto('f1'), foto('f2')]})
    await fireEvent.press(screen.getByRole('button', {name: 'Foto 2'}))
    await fireEvent.press(screen.getByRole('button', {name: 'Definir como capa'}))
    await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
    await fireEvent.press(await screen.findByRole('button', {name: 'Continuar'}))
    await screen.findByText('R$ 1.550 – 1.800')
    await preencherPreco('1.650')
    await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
    await screen.findByText('Revise e publique')
    expect(screen.getByLabelText('Foto de capa').props.source.uri).toBe('file://f2.webp')
    expect(screen.getByText('2 fotos')).toBeTruthy()
    expect(espiao).toBeDefined()
  })
})

describe('detalhes', ()=>{
  it('risco quimico bloqueia o avanco e desmarcar libera', async ()=>{
    await abrir('/anunciar/detalhes', completo)
    await fireEvent.press(screen.getByRole('checkbox', {name: /risco químico/}))
    await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
    expect(screen.getByText(/Ecoponto/)).toBeTruthy()
    expect(mockRotas).not.toContain('/anunciar/preco')
    await fireEvent.press(screen.getByRole('checkbox', {name: /risco químico/}))
    await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
    expect(mockRotas).toContain('/anunciar/preco')
  })

  it('escolher armazenamento no seletor passa a pedir a situacao dos dados', async ()=>{
    await abrir('/anunciar/detalhes', {...completo, categoria: ''})
    expect(screen.queryByText('Situação dos dados')).toBeNull()
    await escolherOpcao('Categoria', 'Armazenamento')
    expect(screen.getByText(/Situação dos dados/)).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
    expect(screen.getByText('Marque uma das opções')).toBeTruthy()
    expect(mockRotas).not.toContain('/anunciar/preco')
    await fireEvent.press(screen.getByRole('radio', {name: 'Contém dados'}))
    await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
    expect(mockRotas).toContain('/anunciar/preco')
    expect(lerRascunho().situacaoDados).toBe('CONTEM')
  })

  it('trocar de armazenamento para outra categoria nao pede mais os dados', async ()=>{
    await abrir('/anunciar/detalhes', {...completo, categoria: 'Armazenamento'})
    expect(screen.getByText(/Situação dos dados/)).toBeTruthy()
    await escolherOpcao('Categoria', 'Fonte')
    expect(screen.queryByText(/Situação dos dados/)).toBeNull()
    await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
    expect(mockRotas).toContain('/anunciar/preco')
  })

  it('estado com defeito pede foto do defeito e voltar para funciona tira o pedido', async ()=>{
    await abrir('/anunciar/detalhes', completo)
    await fireEvent.press(screen.getByRole('radio', {name: 'Funciona em partes'}))
    await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
    expect(screen.getByText('Adicione pelo menos uma foto do defeito')).toBeTruthy()
    await fireEvent.press(screen.getByRole('radio', {name: 'Funciona'}))
    expect(screen.queryByText('Fotos do defeito')).toBeNull()
    await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
    expect(mockRotas).toContain('/anunciar/preco')
  })
})

describe('preco', ()=>{
  it('divergencia de exatamente 50% abaixo do meio da faixa pede confirmacao', async ()=>{
    await abrir('/anunciar/preco', {...completo})
    await screen.findByText('R$ 1.550 – 1.800')
    await preencherPreco('837,50')
    await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
    expect(screen.getByText(/risco de anúncio fraudulento/)).toBeTruthy()
    expect(mockRotas).not.toContain('/anunciar/revisao')
  })

  it('um centavo acima do limite de 50% passa direto', async ()=>{
    await abrir('/anunciar/preco', {...completo})
    await screen.findByText('R$ 1.550 – 1.800')
    await preencherPreco('837,51')
    await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
    expect(mockRotas).toContain('/anunciar/revisao')
  })

  it('exatamente 50% acima do meio da faixa pede confirmacao', async ()=>{
    await abrir('/anunciar/preco', {...completo})
    await screen.findByText('R$ 1.550 – 1.800')
    await preencherPreco('2.512,50')
    await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
    expect(screen.getByText(/risco de anúncio fraudulento/)).toBeTruthy()
  })

  it('corrigir preco volta pro campo e o preco novo segue sem pedir de novo', async ()=>{
    await abrir('/anunciar/preco', {...completo})
    await screen.findByText('R$ 1.550 – 1.800')
    await preencherPreco('400')
    await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
    await fireEvent.press(screen.getByRole('button', {name: 'Corrigir preço'}))
    expect(mockRotas).not.toContain('/anunciar/revisao')
    await fireEvent.changeText(screen.getByLabelText('Preço'), '1.700')
    await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
    expect(mockRotas).toContain('/anunciar/revisao')
    expect(lerRascunho().precoCents).toBe(170000)
  })

  it('categoria sem referencia no servidor deixa seguir sem confirmacao', async ()=>{
    await abrir('/anunciar/preco', {...completo, categoria: 'Fonte', titulo: 'Fonte 500W'})
    await preencherPreco('1')
    await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
    expect(mockRotas).toContain('/anunciar/revisao')
  })
})

describe('revisao e publicacao', ()=>{
  const pronto = {...completo, precoCents: 165000, precoMinimoCents: null, entrega: 'ENCONTRO', bairro: 'Bairro Centro'}

  it('declaracao marcada e desmarcada trava o botao e nao envia nada', async ()=>{
    const espiao = jest.spyOn(globalThis, 'fetch')
    await abrir('/anunciar/revisao', pronto)
    const botao = ()=> screen.getByRole('button', {name: 'Publicar anúncio'})
    expect(botao()).toBeDisabled()
    await fireEvent.press(screen.getByRole('checkbox'))
    expect(botao()).toBeEnabled()
    await fireEvent.press(screen.getByRole('checkbox'))
    expect(botao()).toBeDisabled()
    await fireEvent.press(botao())
    expect(chamadasPublicar(espiao)).toHaveLength(0)
    expect(mockRotas).not.toContain('/anuncios')
  })

  it('envia o corpo certo para a api, com armazenamento e dados', async ()=>{
    const espiao = jest.spyOn(globalThis, 'fetch')
    await abrir('/anunciar/revisao', {...pronto, categoria: 'Armazenamento', situacaoDados: 'REMOVIDO', aceite: true, descricao: 'SSD usado pouco', especificacoes: ['500 GB']})
    await fireEvent.press(screen.getByRole('button', {name: 'Publicar anúncio'}))
    await waitFor(()=> expect(mockRotas).toContain('/anuncios'), TEMPO)
    const chamadas = chamadasPublicar(espiao)
    expect(chamadas).toHaveLength(1)
    const corpo = JSON.parse(chamadas[0][1].body)
    expect(corpo.dataStatus).toBe('REMOVIDO')
    expect(corpo.category).toBe('Armazenamento')
    expect(corpo.priceCents).toBe(165000)
    expect(corpo.mediaIds).toHaveLength(1)
    expect(corpo.hazardousMaterial).toBe(false)
    expect(corpo.sellerDeclarationAccepted).toBe(true)
    expect(corpo.neighborhood).toBe('Bairro Centro')
  })

  it('descricao com e-mail mostra o erro do servidor e nao publica', async ()=>{
    await abrir('/anunciar/revisao', {...pronto, aceite: true, descricao: 'fale comigo em joao@email.com'})
    await fireEvent.press(screen.getByRole('button', {name: 'Publicar anúncio'}))
    expect(await screen.findByText('Dados pessoais na descrição', {}, TEMPO)).toBeTruthy()
    expect(screen.getByText('Tire telefone, e-mail ou endereço da descrição.')).toBeTruthy()
    expect(mockRotas).not.toContain('/anuncios')
    expect(screen.getByRole('button', {name: 'Publicar anúncio'})).toBeEnabled()
  })

  it('sem conexao mostra a mensagem, guarda o rascunho e a segunda tentativa publica', async ()=>{
    await abrir('/anunciar/revisao', {...pronto, aceite: true})
    const espiao = jest.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Network request failed'))
    await fireEvent.press(screen.getByRole('button', {name: 'Publicar anúncio'}))
    expect(await screen.findByText('Sem conexão. Seu anúncio continua salvo aqui, tente de novo.', {}, TEMPO)).toBeTruthy()
    expect(lerRascunho().titulo).toBe('Placa de vídeo genérica 8GB')
    expect(mockRotas).not.toContain('/anuncios')
    expect(screen.getByRole('button', {name: 'Publicar anúncio'})).toBeEnabled()
    await fireEvent.press(screen.getByRole('button', {name: 'Publicar anúncio'}))
    await waitFor(()=> expect(mockRotas).toContain('/anuncios'), TEMPO)
    expect(chamadasPublicar(espiao)).toHaveLength(1)
  })

  it('queda de rede so no POST de offers tambem mostra sem conexao', async ()=>{
    await abrir('/anunciar/revisao', {...pronto, aceite: true})
    const original = globalThis.fetch
    jest.spyOn(globalThis, 'fetch').mockImplementation((async (url: any, opcoes: any)=>{
      if(String(url).endsWith('/offers') && opcoes && opcoes.method == 'POST') throw new TypeError('Network request failed')
      return original(url, opcoes)
    }) as any)
    await fireEvent.press(screen.getByRole('button', {name: 'Publicar anúncio'}))
    expect(await screen.findByText(/Sem conexão/, {}, TEMPO)).toBeTruthy()
    expect(lerRascunho().aceite).toBe(true)
  })

  it('limite de 20 anuncios ativos mostra o aviso com o atalho pra encerrar', async ()=>{
    await abrir('/anunciar/revisao', {...pronto, aceite: true})
    const original = globalThis.fetch
    jest.spyOn(globalThis, 'fetch').mockImplementation((async (url: any, opcoes: any)=>{
      if(String(url).endsWith('/offers') && opcoes && opcoes.method == 'POST') return new Response(JSON.stringify({code: 'OFFER_LIMIT_REACHED', detail: 'Você já tem 20 anúncios ativos.'}), {status: 422})
      return original(url, opcoes)
    }) as any)
    await fireEvent.press(screen.getByRole('button', {name: 'Publicar anúncio'}))
    expect(await screen.findByText('Limite de anúncios atingido', {}, TEMPO)).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', {name: 'Encerrar um anúncio'}))
    expect(mockRotas).toContain('/anuncios')
  })
})

describe('fluxo completo', ()=>{
  it('fotos, scanner, detalhes, preco, revisao e publicar aparece em meus anuncios', async ()=>{
    mudarCenarioScanner('AUTO_L5')
    ;(ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({canceled: false, assets: [1, 2].map(asset)})
    const espiao = jest.spyOn(globalThis, 'fetch')
    await abrir('/anunciar/fotos')

    expect(screen.getByRole('button', {name: 'Continuar'})).toBeDisabled()
    await fireEvent.press(screen.getByRole('button', {name: 'Adicionar foto'}))
    await fireEvent.press(screen.getByRole('button', {name: 'Escolher da galeria'}))
    await waitFor(()=> expect(lerRascunho().fotos).toHaveLength(2), TEMPO)
    await fireEvent.press(screen.getByRole('button', {name: 'Usar o Scanner IA'}))
    await waitFor(()=> expect(lerRascunho().titulo).toBe('Placa de vídeo genérica 8GB'), TEMPO)
    expect(lerRascunho().ganhaMoedas).toBe(true)
    await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))

    expect(await screen.findByText('Detalhes do item')).toBeTruthy()
    expect(screen.getByText(/Identificado pelo Scanner IA/)).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
    expect(screen.getAllByText('Campo obrigatório')).toHaveLength(2)
    await escolherOpcao('Tempo de uso', '1 a 2 anos')
    await fireEvent.press(screen.getByRole('radio', {name: 'Funciona'}))
    await fireEvent.changeText(screen.getByLabelText('Descrição'), 'Usada em PC gamer, caixa original.')
    await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))

    expect(await screen.findByText(/Forma de entrega/)).toBeTruthy()
    await screen.findByText('R$ 1.550 – 1.800')
    await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
    expect(screen.getAllByText('Campo obrigatório')).toHaveLength(3)
    await preencherPreco('1.650')
    await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))

    expect(await screen.findByText('Revise e publique')).toBeTruthy()
    expect(screen.getByText('R$ 1.650')).toBeTruthy()
    expect(screen.getByText('2 fotos')).toBeTruthy()
    expect(screen.getByText('Você ganha moedas pelo Scanner IA.')).toBeTruthy()
    expect(screen.getByRole('button', {name: 'Publicar anúncio'})).toBeDisabled()
    await fireEvent.press(screen.getByRole('checkbox'))
    await fireEvent.press(screen.getByRole('button', {name: 'Publicar anúncio'}))

    await screen.findByText('Meus anúncios', {}, TEMPO)
    await waitFor(()=> expect(screen.getAllByText('Placa de vídeo genérica 8GB')).toHaveLength(2), TEMPO)
    expect(screen.getAllByText('Em análise').length).toBeGreaterThan(0)
    expect(lerRascunho().titulo).toBe('')
    expect(lerRascunho().fotos).toHaveLength(0)
    expect(lerRascunho().aceite).toBe(false)

    const chamadas = chamadasPublicar(espiao)
    expect(chamadas).toHaveLength(1)
    const corpo = JSON.parse(chamadas[0][1].body)
    expect(corpo.mediaIds).toHaveLength(2)
    expect(corpo.usedScanner).toBe(true)
    expect(corpo.fieldOrigin.titulo).toBe('IA')
    expect(corpo.description).toBe('Usada em PC gamer, caixa original.')
    expect(corpo.dataStatus).toBeNull()
  })

  it('telefone na descricao barra a publicacao, editar descricao volta e publica uma vez so', async ()=>{
    await abrir('/anunciar/detalhes', {...completo, descricao: 'me chama no 44 99999-0000'})
    await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
    await screen.findByText('R$ 1.550 – 1.800')
    await preencherPreco('1.650')
    await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
    await screen.findByText('Revise e publique')
    await fireEvent.press(screen.getByRole('checkbox'))
    await fireEvent.press(screen.getByRole('button', {name: 'Publicar anúncio'}))
    expect(await screen.findByText('Dados pessoais na descrição', {}, TEMPO)).toBeTruthy()
    expect(screen.getByText('Tire telefone, e-mail ou endereço da descrição.')).toBeTruthy()

    await fireEvent.press(screen.getByRole('button', {name: 'Editar descrição'}))
    await screen.findByText('Detalhes do item')
    expect(screen.getByLabelText('Descrição').props.value).toBe('me chama no 44 99999-0000')
    await fireEvent.changeText(screen.getByLabelText('Descrição'), 'Usada, funcionando bem.')
    await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
    await screen.findByText('R$ 1.550 – 1.800')
    expect(screen.getByLabelText('Preço').props.value).toBe('1.650')
    await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
    await screen.findByText('Revise e publique')
    expect(screen.getByRole('button', {name: 'Publicar anúncio'})).toBeEnabled()
    await fireEvent.press(screen.getByRole('button', {name: 'Publicar anúncio'}))

    await screen.findByText('Meus anúncios', {}, TEMPO)
    await waitFor(()=> expect(screen.getAllByText('Placa de vídeo genérica 8GB')).toHaveLength(2), TEMPO)
  })

  it('preco divergente no meio do fluxo mantido segue pra revisao com o preco digitado', async ()=>{
    await abrir('/anunciar/detalhes', completo)
    await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
    await screen.findByText('R$ 1.550 – 1.800')
    await preencherPreco('400')
    await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
    expect(screen.getByText(/risco de anúncio fraudulento/)).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', {name: 'Manter preço'}))
    expect(await screen.findByText('Revise e publique')).toBeTruthy()
    expect(screen.getByText('R$ 400')).toBeTruthy()
  })

  it('risco quimico marcado nos detalhes impede de chegar na revisao', async ()=>{
    await abrir('/anunciar/detalhes', {...completo, materialPerigoso: true})
    await fireEvent.press(screen.getByRole('button', {name: 'Continuar'}))
    expect(mockRotas).not.toContain('/anunciar/preco')
    expect(screen.getByText(/Ecoponto/)).toBeTruthy()
  })
})

describe('meus anuncios e edicao', ()=>{
  async function abrirLista(){
    await abrir('/anuncios')
    await screen.findByText('Processador 6 núcleos + cooler')
  }

  it('pausar e reabrir o mesmo anuncio passa por pausado e em analise', async ()=>{
    await abrirLista()
    await fireEvent.press(screen.getByRole('button', {name: 'Pausar Placa de vídeo genérica 8GB'}))
    await fireEvent.changeText(screen.getByLabelText('Motivo da pausa'), 'Vou viajar')
    await fireEvent.press(screen.getByRole('button', {name: 'Confirmar pausa'}))
    await waitFor(()=> expect(screen.getByRole('button', {name: 'Reabrir Placa de vídeo genérica 8GB'})).toBeTruthy(), TEMPO)
    expect(screen.queryByRole('button', {name: 'Pausar Placa de vídeo genérica 8GB'})).toBeNull()
    await fireEvent.press(screen.getByRole('button', {name: 'Reabrir Placa de vídeo genérica 8GB'}))
    await fireEvent.press(screen.getByRole('button', {name: 'Confirmar reabertura'}))
    await waitFor(()=> expect(screen.queryByRole('button', {name: 'Reabrir Placa de vídeo genérica 8GB'})).toBeNull(), TEMPO)
    expect(screen.getAllByText('Em análise').length).toBeGreaterThan(0)
  })

  it('reabrir com preco novo guarda o preco e o estado escolhido', async ()=>{
    await abrirLista()
    await fireEvent.press(screen.getByRole('button', {name: 'Reabrir Kit memória 16GB DDR4'}))
    await fireEvent.changeText(screen.getByLabelText('Preço'), '200')
    await fireEvent.press(screen.getByRole('radio', {name: 'Funciona com defeito'}))
    await fireEvent.press(screen.getByRole('button', {name: 'Confirmar reabertura'}))
    await waitFor(()=> expect(screen.getByText('R$ 200')).toBeTruthy(), TEMPO)
  })

  it('novo anuncio publicado aparece em analise e pode ser editado', async ()=>{
    await abrir('/anunciar/revisao', {...completo, precoCents: 165000, entrega: 'ENCONTRO', bairro: 'Bairro Centro', aceite: true, titulo: 'Fonte nova 650W'})
    await fireEvent.press(screen.getByRole('button', {name: 'Publicar anúncio'}))
    await screen.findByText('Meus anúncios', {}, TEMPO)
    await fireEvent.press(await screen.findByRole('button', {name: 'Editar Fonte nova 650W'}))
    expect(await screen.findByDisplayValue('Fonte nova 650W', {}, TEMPO)).toBeTruthy()
    await fireEvent.changeText(screen.getByLabelText('Preço'), '1.200')
    await fireEvent.press(screen.getByRole('button', {name: 'Salvar alterações'}))
    await waitFor(()=> expect(mockRotas[mockRotas.length - 1]).toBe('voltar'), TEMPO)
    expect(await screen.findByText('R$ 1.200', {}, TEMPO)).toBeTruthy()
  })

  it('editar pelo botao da lista abre a tela com o anuncio certo e salva voltando pra lista', async ()=>{
    await abrirLista()
    await fireEvent.press(screen.getByRole('button', {name: 'Editar Processador 6 núcleos + cooler'}))
    expect(await screen.findByDisplayValue('Processador 6 núcleos + cooler')).toBeTruthy()
    await fireEvent.changeText(screen.getByLabelText('Preço'), '650')
    await fireEvent.press(screen.getByRole('button', {name: 'Salvar alterações'}))
    expect(await screen.findByText('R$ 650', {}, TEMPO)).toBeTruthy()
    expect(screen.getByRole('button', {name: 'Editar Processador 6 núcleos + cooler'})).toBeTruthy()
  })

  it('editar a descricao com telefone mostra o erro do servidor e nao sai da tela', async ()=>{
    await abrir('/anuncios/a1')
    await screen.findByDisplayValue('Placa de vídeo genérica 8GB')
    await fireEvent.changeText(screen.getByLabelText('Descrição'), 'liga 44 99999-0000')
    await fireEvent.press(screen.getByRole('button', {name: 'Salvar alterações'}))
    expect(await screen.findByText('Tire telefone, e-mail ou endereço da descrição.', {}, TEMPO)).toBeTruthy()
    expect(mockRotas).not.toContain('voltar')
  })

  it('conflito de versao, ver versao atual e salvar de novo funciona', async ()=>{
    await abrir('/anuncios/a1')
    await screen.findByDisplayValue('Placa de vídeo genérica 8GB')
    await fetch(URL_API + '/offers/a1', {method: 'PATCH', body: JSON.stringify({title: 'Mudado por outro', version: 1})})
    await fireEvent.changeText(screen.getByLabelText('Título'), 'Meu titulo')
    await fireEvent.press(screen.getByRole('button', {name: 'Salvar alterações'}))
    expect(await screen.findByText('Alguém alterou esse anúncio enquanto você editava.', {}, TEMPO)).toBeTruthy()
    expect(mockRotas).not.toContain('voltar')
    await fireEvent.press(screen.getByRole('button', {name: 'Ver versão atual'}))
    expect(await screen.findByDisplayValue('Mudado por outro', {}, TEMPO)).toBeTruthy()
    expect(screen.queryByText('Alguém alterou esse anúncio enquanto você editava.')).toBeNull()
    await fireEvent.changeText(screen.getByLabelText('Título'), 'Titulo depois do conflito')
    await fireEvent.press(screen.getByRole('button', {name: 'Salvar alterações'}))
    await waitFor(()=> expect(mockRotas).toContain('voltar'), TEMPO)
  })

  it('editar sem conexao mostra a mensagem e mantem o que foi digitado', async ()=>{
    await abrir('/anuncios/a1')
    await screen.findByDisplayValue('Placa de vídeo genérica 8GB')
    await fireEvent.changeText(screen.getByLabelText('Título'), 'Titulo novo')
    jest.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Network request failed'))
    await fireEvent.press(screen.getByRole('button', {name: 'Salvar alterações'}))
    expect(await screen.findByText('Sem conexão. Suas alterações continuam aqui, tente de novo.', {}, TEMPO)).toBeTruthy()
    expect(screen.getByDisplayValue('Titulo novo')).toBeTruthy()
  })

  it('criar novo anuncio pela lista zera o rascunho e abre as fotos', async ()=>{
    await abrir('/anuncios', {...completo, aceite: true})
    await screen.findByText('Processador 6 núcleos + cooler')
    await fireEvent.press(screen.getByRole('button', {name: 'Criar anúncio'}))
    expect(mockRotas).toContain('/anunciar/fotos')
    expect(await screen.findByText('Fotos do item')).toBeTruthy()
    expect(lerRascunho().titulo).toBe('')
    expect(lerRascunho().aceite).toBe(false)
    expect(lerRascunho().fotos).toHaveLength(0)
  })
})
