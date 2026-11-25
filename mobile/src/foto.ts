import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { File } from 'expo-file-system'

export const MAX_FOTOS = 6
export const MAX_ENTRADA = 5 * 1024 * 1024
export const MAX_ENVIO = 300 * 1024
export const LADO_MAX = 1600
export const LADO_MIN = 600

const FORMATOS = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif']

export type Foto = {
  id: string
  uri: string
  largura: number
  altura: number
  bytes: number
}

export function validarFoto(largura: number, altura: number, bytes?: number | null, tipo?: string | null, brilho?: number | null){
  if(tipo && !FORMATOS.includes(tipo.toLowerCase())) return 'Formato não aceito. Use JPG, PNG ou HEIC.'
  if(bytes && bytes > MAX_ENTRADA) return 'A foto passa de 5 MB. Escolha outra.'

  if(largura > 0 && altura > 0){
    const proporcao = largura / altura
    if(proporcao < 0.75 || proporcao > 1.34) return 'Enquadramento inadequado — use proporção padrão'
    if(Math.min(largura, altura) < LADO_MIN) return 'Foto com resolução muito baixa. Chegue mais perto da peça.'
  }

  if(brilho != null && brilho < -2) return 'Iluminação insuficiente — tente em um local mais claro'

  return ''
}

export async function comprimirFoto(uri: string, largura: number, altura: number){
  const tentativas = [
    {lado: LADO_MAX, qualidade: 0.7},
    {lado: LADO_MAX, qualidade: 0.5},
    {lado: 1280, qualidade: 0.5},
    {lado: 1024, qualidade: 0.4},
  ]

  for(let i = 0; i < tentativas.length; i++){
    const t = tentativas[i]
    const contexto = ImageManipulator.manipulate(uri)

    if(largura >= altura && largura > t.lado) contexto.resize({width: t.lado})
    else if(altura > largura && altura > t.lado) contexto.resize({height: t.lado})

    const imagem = await contexto.renderAsync()
    const salva = await imagem.saveAsync({compress: t.qualidade, format: SaveFormat.WEBP})
    const bytes = new File(salva.uri).size

    if(bytes <= MAX_ENVIO){
      return {uri: salva.uri, largura: salva.width, altura: salva.height, bytes: bytes}
    }
  }

  throw new Error('foto muito pesada, tente tirar outra com menos detalhe no fundo')
}

export async function prepararFotos(lista: any[]){
  const prontas: Foto[] = []
  const erros: string[] = []

  for(let i = 0; i < lista.length; i++){
    const f = lista[i]
    const brilho = f.exif && f.exif.BrightnessValue != undefined ? Number(f.exif.BrightnessValue) : null
    const erro = validarFoto(f.width, f.height, f.fileSize, f.mimeType, brilho)
    if(erro != ''){
      erros.push(erro)
      continue
    }

    try{
      const c = await comprimirFoto(f.uri, f.width, f.height)
      prontas.push({id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), uri: c.uri, largura: c.largura, altura: c.altura, bytes: c.bytes})
    }catch(e: any){
      erros.push(e.message)
    }
  }

  return {prontas, erros}
}
