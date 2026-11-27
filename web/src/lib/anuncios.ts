import { CircuitBoard, Cpu, Gpu, HardDrive, MemoryStick, Package, PlugZap, type LucideIcon } from 'lucide-react'

/** Categorias e condições aceitas pelo backend (EDTS-373), com rótulos em português. */
export const CATEGORIAS: ReadonlyArray<{ valor: string; rotulo: string; icone: LucideIcon }> = [
  { valor: 'gpu', rotulo: 'Placa de vídeo', icone: Gpu },
  { valor: 'cpu', rotulo: 'Processador', icone: Cpu },
  { valor: 'ram', rotulo: 'Memória', icone: MemoryStick },
  { valor: 'storage', rotulo: 'Armazenamento', icone: HardDrive },
  { valor: 'motherboard', rotulo: 'Placa-mãe', icone: CircuitBoard },
  { valor: 'psu', rotulo: 'Fonte', icone: PlugZap },
]

export const CONDICOES = [
  { valor: 'NOVO', rotulo: 'Novo' },
  { valor: 'SEMINOVO', rotulo: 'Seminovo' },
  { valor: 'USADO', rotulo: 'Usado' },
  { valor: 'DEFEITO_SUCATA', rotulo: 'Com defeito' },
] as const

export const categoria = (valor: string) => CATEGORIAS.find((c) => c.valor === valor) ?? { valor, rotulo: valor, icone: Package }
export const rotuloCondicao = (valor: string) => CONDICOES.find((c) => c.valor === valor)?.rotulo ?? valor

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** 175000 → "R$ 1.750,00" (valores em centavos, ADR-13). */
export const preco = (centavos: number) => moeda.format(centavos / 100)

/** "1.750,50" ou "1750.5" → 175050. Devolve null se não for um valor válido. */
export function centavosDe(texto: string): number | null {
  const limpo = texto.replace(/[^\d,.]/g, '').trim()
  if (!limpo) return null
  const normal = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo
  const valor = Number(normal)
  return Number.isFinite(valor) && valor >= 0 ? Math.round(valor * 100) : null
}

/** Cidades de referência para quem não quer compartilhar a localização (o servidor arredonda, RB-06). */
export const CIDADES_REFERENCIA = [
  { nome: 'Maringá', uf: 'PR', lat: -23.4205, lon: -51.9333 },
  { nome: 'Londrina', uf: 'PR', lat: -23.3045, lon: -51.1696 },
  { nome: 'Curitiba', uf: 'PR', lat: -25.4284, lon: -49.2733 },
] as const

export const boostAtivo = (ate?: string | null) => Boolean(ate && Date.parse(ate) > Date.now())
