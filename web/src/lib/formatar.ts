/** Formatação em pt-BR (números com vírgula, datas e tempo relativo). */

const numero1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const inteiro = new Intl.NumberFormat('pt-BR')
const relativo = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export const umaCasa = (valor: number) => numero1.format(valor)
export const numeroInteiro = (valor: number) => inteiro.format(valor)
export const quilos = (valor: number) => `${umaCasa(valor)} kg`

/** "2026-03-04T…" → "mar/2026" */
export function mesAno(iso: string): string {
  const d = new Date(iso)
  return `${meses[d.getUTCMonth()]}/${d.getUTCFullYear()}`
}

/** "2026-12-17T…" → "17/12/2026" */
export function dataCurta(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(new Date(iso))
}

/** Tempo relativo: "agora", "há 3 dias", "há 2 meses". */
export function haQuanto(iso: string, agora = Date.now()): string {
  const segundos = Math.round((new Date(iso).getTime() - agora) / 1000)
  const abs = Math.abs(segundos)
  if (abs < 60) return 'agora'
  const unidades: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ]
  for (const [unidade, tamanho] of unidades) {
    if (abs >= tamanho) return relativo.format(Math.round(segundos / tamanho), unidade)
  }
  return 'agora'
}

/** Segundos → "04:57" */
export function mmss(segundos: number): string {
  const s = Math.max(0, Math.ceil(segundos))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
