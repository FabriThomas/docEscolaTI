import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { DEMO } from '@/mocks/demo'
import { useComparador } from '@/stores/comparador'
import { esperarSemViolacoes, logarComo, renderizarApp } from '@/test/utilidades'

const BRUNO = DEMO.contas[1].email

describe('Feed e busca de anúncios (telas 001 e 015 a 019, EDTS-373)', () => {
  it('mostra o feed com o anúncio impulsionado primeiro e filtra por categoria', async () => {
    const { usuario } = renderizarApp('/')
    const feed = await screen.findByRole('region', { name: 'Anúncios recentes' })
    const titulos = await within(feed).findAllByRole('heading', { level: 3 })
    expect(titulos[0]).toHaveTextContent('RTX 3060 Ti 8 GB ASUS Dual')
    expect(within(feed).getByText('R$ 1.750,00')).toBeInTheDocument()
    await esperarSemViolacoes()

    await usuario.click(within(feed).getByRole('radio', { name: 'Processador' }))
    await waitFor(() => expect(within(feed).getAllByRole('heading', { level: 3 })).toHaveLength(1))
    expect(within(feed).getByRole('heading', { name: 'Ryzen 5 5600 com cooler box' })).toBeInTheDocument()
  })

  it('busca por texto e por raio a partir de uma cidade', async () => {
    const { usuario } = renderizarApp('/buscar?q=ssd')
    expect(await screen.findByRole('heading', { name: 'SSD NVMe 1 TB' })).toBeInTheDocument()
    expect(screen.getByText('1 anúncio encontrado')).toBeInTheDocument()
    await esperarSemViolacoes()

    await usuario.clear(screen.getByLabelText('O que você procura'))
    await usuario.selectOptions(screen.getByLabelText('Perto de'), 'Curitiba')
    await usuario.selectOptions(screen.getByLabelText('Raio'), '25')
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(await screen.findByRole('heading', { name: 'Fonte 650 W 80 Plus Bronze' })).toBeInTheDocument()
    expect(screen.getByText(/1 anúncio encontrado em até 25 km/)).toBeInTheDocument()
  })
})

describe('Detalhe do anúncio', () => {
  it('mostra especificações e pede login para favoritar', async () => {
    const { usuario } = renderizarApp('/anuncios/an-rtx3060ti')
    expect(await screen.findByRole('heading', { level: 1, name: 'RTX 3060 Ti 8 GB ASUS Dual' })).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: 'VRAM' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '8 GB GDDR6' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Seu anúncio' })).not.toBeInTheDocument()
    await esperarSemViolacoes()

    await usuario.click(screen.getByRole('button', { name: /Favoritar: RTX/ }))
    expect(await screen.findByRole('heading', { name: 'Acesse sua conta' })).toBeInTheDocument()
  })

  it('anúncio inexistente mostra aviso', async () => {
    renderizarApp('/anuncios/nao-existe')
    expect(await screen.findByRole('heading', { name: 'Anúncio não encontrado' })).toBeInTheDocument()
  })

  it('quem anunciou pausa, reativa, impulsiona e vê estatísticas', async () => {
    logarComo(BRUNO)
    const { usuario } = renderizarApp('/anuncios/an-ryzen5600')
    await screen.findByRole('heading', { name: 'Seu anúncio' })

    await usuario.click(screen.getByRole('button', { name: 'Pausar' }))
    expect(await screen.findByText('Anúncio pausado. Ele não aparece mais nas buscas.')).toBeInTheDocument()
    await usuario.click(await screen.findByRole('button', { name: 'Reativar' }))
    expect(await screen.findByText('Anúncio reativado.')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Estatísticas' }))
    expect(await screen.findByText('Visualizações')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Impulsionar' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Impulsionar anúncio' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Impulsionar por 20 moedas' }))
    expect(await screen.findByText(/Anúncio impulsionado até .* 20 moedas usadas\./)).toBeInTheDocument()
  })

  it('favorita, aparece em Favoritos e compara dois anúncios', async () => {
    logarComo(BRUNO)
    useComparador.setState({ ids: [] })
    const { usuario } = renderizarApp('/anuncios/an-rtx3060ti')
    await usuario.click(await screen.findByRole('button', { name: /Favoritar: RTX/ }))
    expect(await screen.findByText('Adicionado aos favoritos.')).toBeInTheDocument()

    useComparador.setState({ ids: ['an-rtx3060ti', 'an-gtx960'] })
    await usuario.click(await screen.findByRole('link', { name: 'Ver comparação (2)' }))
    const tabela = await screen.findByRole('table', { name: 'Comparação de especificações' })
    expect(within(tabela).getByRole('rowheader', { name: 'TDP' })).toBeInTheDocument()
    expect(within(tabela).getByRole('cell', { name: '120 W' })).toBeInTheDocument()
  })
})

describe('Anunciar (telas 003 a 006)', () => {
  it('valida cada etapa e publica com foto', async () => {
    logarComo(BRUNO)
    const { usuario } = renderizarApp('/anunciar')
    await screen.findByRole('heading', { name: 'Criar anúncio · Fotos' })
    await esperarSemViolacoes()

    await usuario.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(await screen.findByText('Adicione pelo menos uma foto da peça.')).toBeInTheDocument()
    await usuario.upload(screen.getByLabelText('Escolher fotos da peça'), new File(['x'], 'placa.png', { type: 'image/png' }))
    expect(await screen.findByRole('img', { name: 'Foto 1 (capa)' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }))

    await screen.findByRole('heading', { name: 'Criar anúncio · Detalhes' })
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(await screen.findByText('Escolha a categoria.')).toBeInTheDocument()
    await usuario.type(screen.getByLabelText(/^Título/), 'RX 580 8 GB Sapphire')
    await usuario.selectOptions(screen.getByLabelText(/^Categoria/), 'gpu')
    await usuario.type(screen.getByLabelText('Item 1'), 'VRAM')
    await usuario.type(screen.getByLabelText('Valor 1'), '8 GB')
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }))

    await screen.findByRole('heading', { name: 'Criar anúncio · Preço e local' })
    await usuario.type(screen.getByLabelText(/^Preço/), '450,00')
    await usuario.click(screen.getByRole('button', { name: 'Maringá – PR' }))
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }))

    await screen.findByRole('heading', { name: 'Criar anúncio · Revisão' })
    expect(screen.getByText('R$ 450,00')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Publicar anúncio' }))
    expect(await screen.findByText('Confirme que as informações são verdadeiras.')).toBeInTheDocument()
    await usuario.click(screen.getByRole('checkbox', { name: /Confirmo que as informações/ }))
    await usuario.click(screen.getByRole('button', { name: 'Publicar anúncio' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'RX 580 8 GB Sapphire' })).toBeInTheDocument()
    expect(screen.getByText('Anúncio publicado!')).toBeInTheDocument()
    expect(screen.getByText('1 foto sem metadados de localização')).toBeInTheDocument()
  })
})
