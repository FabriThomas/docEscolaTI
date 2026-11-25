import { createContext, useContext, useState } from 'react'

export const ESTADOS = [
  {valor: 'FUNCIONA',                  texto: 'Funciona'},
  {valor: 'FUNCIONA_COM_DEFEITO',      texto: 'Funciona com defeito'},
  {valor: 'NAO_FUNCIONA_DESCONHECIDO', texto: 'Não funciona e não sei o porquê'},
  {valor: 'NAO_FUNCIONA_CONHECIDO',    texto: 'Não funciona por um motivo que eu sei'},
  {valor: 'FUNCIONA_EM_PARTES',        texto: 'Funciona em partes'},
]

export const CATEGORIAS = ['Placa-mãe', 'Processador', 'Memória RAM', 'Placa de vídeo', 'Fonte', 'Gabinete', 'Armazenamento']

export const TEMPOS_USO = ['Menos de 1 ano', '1 a 2 anos', 'Mais de 2 anos']

export const rascunhoVazio = {
  fotos: [] as any[],
  fotosDefeito: [] as any[],
  titulo: '',
  categoria: '',
  tempoUso: '',
  estado: '',
  especificacoes: [] as string[],
  descricao: '',
  tipoOferta: 'PECA',
  modelo: '',
  numeroSerie: '',
  situacaoDados: '',
  materialPerigoso: false,
  precoCents: null as number | null,
  aceitaPropostas: true,
  precoMinimoCents: null as number | null,
  entrega: '',
  bairro: '',
  origem: {} as any,
  aceite: false,
  scanner: null as any,
  ganhaMoedas: false,
}

const RascunhoContext = createContext<any>(null)

export function RascunhoProvider({children, inicial}: {children: any, inicial?: any}){
  const [anuncio, setAnuncio] = useState(inicial || rascunhoVazio)
  return (
    <RascunhoContext.Provider value={{anuncio, setAnuncio}}>
      {children}
    </RascunhoContext.Provider>
  )
}

export function useRascunho(){
  return useContext(RascunhoContext)
}

export function reais(cents: number){
  if(cents % 100 == 0) return (cents / 100).toLocaleString('pt-BR')
  return (cents / 100).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})
}

export function paraCentavos(texto: string){
  let t = texto.replace(/[^\d.,]/g, '')
  if(!t) return null
  if(t.includes(',')){
    t = t.replace(/\./g, '').replace(',', '.')
  }else if(/\.\d{1,2}$/.test(t)){
    const i = t.lastIndexOf('.')
    t = t.slice(0, i).replace(/\./g, '') + '.' + t.slice(i + 1)
  }else{
    t = t.replace(/\./g, '')
  }
  if(!/^\d+(\.\d{1,2})?$/.test(t)) return null
  return Math.round(Number(t) * 100)
}
