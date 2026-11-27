import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { DEMO } from '@/mocks/demo'
import { esperarSemViolacoes, logarComo, renderizarApp } from '@/test/utilidades'

const ANA = DEMO.contas[0].email
const BRUNO = DEMO.contas[1].email

describe('Rota protegida', () => {
  it('sem sessão, manda para o login', async () => {
    renderizarApp('/perfil')
    expect(await screen.findByRole('heading', { name: 'Acesse sua conta' })).toBeInTheDocument()
  })
})

describe('Meu perfil (tela 052, STY011)', () => {
  it('mostra reputação, selos e atalhos com números em pt-BR', async () => {
    logarComo(ANA)
    renderizarApp('/perfil')
    await screen.findByRole('heading', { name: 'Perfil' })
    const resumo = screen.getByRole('region', { name: 'Resumo do perfil' })
    expect(within(resumo).getByText('Ana P.')).toBeInTheDocument()
    expect(within(resumo).getByText(/Zona 7, Maringá – PR · desde mar\/2026/)).toBeInTheDocument()
    expect(within(resumo).getByText('E-mail verificado · 2FA ativo')).toBeInTheDocument()
    expect(screen.getByText('23 avaliações · 31 negociações')).toBeInTheDocument()
    expect(screen.getByText('Fidelidade do anúncio')).toBeInTheDocument()
    expect(screen.getByText('7,4 kg evitados')).toBeInTheDocument()
    expect(screen.getByText('340 moedas disponíveis')).toBeInTheDocument()
    await esperarSemViolacoes()
  })

  it('perfil sem avaliações mostra o estado vazio (STY011, fluxo alternativo 2)', async () => {
    logarComo(BRUNO)
    renderizarApp('/perfil')
    expect(await screen.findByText(/Ainda sem avaliações/)).toBeInTheDocument()
  })
})

describe('Editar perfil (tela 053)', () => {
  it('salva o nome e volta ao perfil', async () => {
    logarComo(ANA)
    const { usuario } = renderizarApp('/perfil/editar')
    const nome = await screen.findByLabelText(/Nome de exibição/)
    await waitFor(() => expect(nome).toHaveValue('Ana P.'))
    await esperarSemViolacoes()
    await usuario.clear(nome)
    await usuario.type(nome, 'Ana Souza')
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    await screen.findByRole('heading', { name: 'Perfil' })
    expect(within(screen.getByRole('region', { name: 'Resumo do perfil' })).getByText('Ana Souza')).toBeInTheDocument()
    expect(screen.getByText('Perfil atualizado.')).toBeInTheDocument()
  })

  it('não deixa colocar contato no nome', async () => {
    logarComo(ANA)
    const { usuario } = renderizarApp('/perfil/editar')
    const nome = await screen.findByLabelText(/Nome de exibição/)
    await waitFor(() => expect(nome).toHaveValue('Ana P.'))
    await usuario.clear(nome)
    await usuario.type(nome, 'ana@email.com')
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    expect(await screen.findByText('Não use e-mail ou telefone no nome de exibição.')).toBeInTheDocument()
  })
})

describe('Segurança (tela 054, STY007 a STY009)', () => {
  it('lista sessões e encerra outra sessão com confirmação', async () => {
    logarComo(ANA)
    const { usuario } = renderizarApp('/seguranca')
    await screen.findByRole('heading', { name: 'Segurança' })
    expect(screen.getByText('Sua conta está protegida')).toBeInTheDocument()
    expect(screen.getByText('Chrome no Windows · este aparelho')).toBeInTheDocument()
    await esperarSemViolacoes()

    await usuario.click(screen.getByRole('button', { name: 'Encerrar sessão em iPhone 13 (app Steely)' }))
    const dialogo = await screen.findByRole('alertdialog', { name: 'Encerrar esta sessão?' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Encerrar sessão' }))
    expect(await screen.findByText('Sessão encerrada.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('iPhone 13 (app Steely)')).not.toBeInTheDocument())
  })

  it('troca a senha validando a senha atual (STY008)', async () => {
    logarComo(ANA)
    const { usuario } = renderizarApp('/seguranca')
    await usuario.click(await screen.findByRole('button', { name: /Alterar senha/ }))
    const dialogo = await screen.findByRole('dialog', { name: 'Alterar senha' })
    await usuario.type(within(dialogo).getByLabelText(/^Senha atual/), 'SenhaErrada@1')
    await usuario.type(within(dialogo).getByLabelText(/^Nova senha/), 'Outra@Senha22')
    await usuario.type(within(dialogo).getByLabelText(/Confirmar nova senha/), 'Outra@Senha22')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Salvar nova senha' }))
    expect(await within(dialogo).findByText('A senha atual está incorreta.')).toBeInTheDocument()

    const atual = within(dialogo).getByLabelText(/^Senha atual/)
    await usuario.clear(atual)
    await usuario.type(atual, DEMO.senha)
    await usuario.click(within(dialogo).getByRole('button', { name: 'Salvar nova senha' }))
    expect(await screen.findByText('Senha alterada. Encerramos as sessões nos outros aparelhos.')).toBeInTheDocument()
  })

  it('desativa e reativa o 2FA (STY007)', async () => {
    logarComo(ANA)
    const { usuario } = renderizarApp('/seguranca')
    await usuario.click(await screen.findByRole('switch', { name: 'Verificação em duas etapas' }))
    const desativar = await screen.findByRole('dialog', { name: 'Desativar verificação em duas etapas' })
    await usuario.type(within(desativar).getByLabelText(/^Senha atual/), DEMO.senha)
    await usuario.type(within(desativar).getByLabelText('Dígito 1 de 6'), DEMO.codigo)
    await usuario.click(within(desativar).getByRole('button', { name: 'Desativar' }))
    expect(await screen.findByText('Proteja melhor sua conta')).toBeInTheDocument()

    await usuario.click(screen.getByRole('switch', { name: 'Verificação em duas etapas' }))
    const ativar = await screen.findByRole('dialog', { name: 'Ativar verificação em duas etapas' })
    await usuario.click(within(ativar).getByRole('button', { name: 'Gerar chave' }))
    await usuario.type(await within(ativar).findByLabelText('Dígito 1 de 6'), DEMO.codigo)
    await usuario.click(within(ativar).getByRole('button', { name: 'Validar e ativar' }))
    const codigos = await screen.findByRole('list', { name: 'Códigos de recuperação' })
    expect(within(codigos).getAllByRole('listitem')).toHaveLength(8)
    const concluir = screen.getByRole('button', { name: 'Concluir' })
    expect(concluir).toBeDisabled()
    await usuario.click(screen.getByRole('checkbox', { name: /Guardei os códigos/ }))
    await usuario.click(concluir)
    expect(await screen.findByText('Sua conta está protegida')).toBeInTheDocument()
  })
})

describe('Excluir conta (tela 056, STY010, ADR-07)', () => {
  it('com saldo de moedas, bloqueia o pedido (RN02)', async () => {
    logarComo(ANA)
    renderizarApp('/conta/excluir')
    expect(await screen.findByText(/340 moedas/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Solicitar exclusão' })).toBeDisabled()
    await esperarSemViolacoes()
  })

  it('sem pendências, registra o pedido e encerra a sessão', async () => {
    logarComo(BRUNO)
    const { usuario } = renderizarApp('/conta/excluir')
    await usuario.click(await screen.findByRole('checkbox', { name: /Entendo as consequências/ }))
    await usuario.type(screen.getByLabelText(/Digite EXCLUIR/), 'EXCLUIR')
    await usuario.type(screen.getByLabelText(/^Senha atual/), DEMO.senha)
    await usuario.click(screen.getByRole('button', { name: 'Solicitar exclusão' }))
    expect(await screen.findByText(/Pedido registrado. Sua conta será excluída em/)).toBeInTheDocument()
    // Volta para a página inicial pública, já sem sessão.
    expect(await screen.findByRole('heading', { level: 1, name: 'Conectando hardware com propósito.' })).toBeInTheDocument()
  })
})
