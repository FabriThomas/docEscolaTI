import { describe, expect, it } from 'vitest'
import { haQuanto, mesAno, mmss, quilos, umaCasa } from './formatar'

describe('formatação pt-BR', () => {
  it('usa vírgula decimal', () => {
    expect(umaCasa(4.8)).toBe('4,8')
    expect(quilos(7.4)).toBe('7,4 kg')
  })
  it('mostra mês/ano como no protótipo 052', () => {
    expect(mesAno('2026-03-04T12:00:00.000Z')).toBe('mar/2026')
  })
  it('descreve tempo relativo', () => {
    const agora = Date.parse('2026-11-17T12:00:00Z')
    expect(haQuanto('2026-11-17T11:59:30Z', agora)).toBe('agora')
    expect(haQuanto('2026-11-14T12:00:00Z', agora)).toBe('há 3 dias')
    expect(haQuanto('2026-09-17T12:00:00Z', agora)).toBe('há 2 meses')
  })
  it('formata contagem regressiva', () => {
    expect(mmss(297)).toBe('04:57')
    expect(mmss(-5)).toBe('00:00')
  })
})
