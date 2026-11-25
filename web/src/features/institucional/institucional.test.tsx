import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { esperarSemViolacoes, renderizarApp } from '@/test/utilidades'

describe('Páginas institucionais (telas 045 a 048)', () => {
  it.each([
    ['/sobre', 'Sobre o Steely'],
    ['/termos', 'Termos de Uso'],
    ['/privacidade', 'Política de Privacidade'],
    ['/ajuda', 'Central de Ajuda'],
    ['/', 'Conectando hardware com propósito.'],
    ['/nao-existe', 'Página não encontrada'],
  ])('%s abre sem violações de acessibilidade', async (rota, titulo) => {
    renderizarApp(rota)
    expect(await screen.findByRole('heading', { level: 1, name: titulo })).toBeInTheDocument()
    await esperarSemViolacoes()
  })

  it('privacidade cita a Cloudflare como operadora (ADR-21)', async () => {
    renderizarApp('/privacidade')
    expect(await screen.findByText(/A Cloudflare atua como operadora/)).toBeInTheDocument()
  })

  it('ajuda filtra por categoria e por busca', async () => {
    const { usuario } = renderizarApp('/ajuda')
    await screen.findByRole('heading', { name: 'Central de Ajuda' })
    await usuario.click(screen.getByRole('radio', { name: 'Conta' }))
    expect(screen.getByRole('button', { name: 'Como excluo minha conta?' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Como funciona a moderação?' })).not.toBeInTheDocument()

    await usuario.click(screen.getByRole('radio', { name: 'Todas' }))
    await usuario.type(screen.getByLabelText('Buscar dúvidas'), 'denuncia')
    expect(screen.getByRole('button', { name: 'Como denunciar um anúncio?' })).toBeInTheDocument()
    expect(screen.getByText('1 pergunta encontrada')).toBeInTheDocument()
  })
})
