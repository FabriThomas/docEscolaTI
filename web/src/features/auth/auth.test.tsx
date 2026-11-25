import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { DEMO } from '@/mocks/demo'
import { esperarSemViolacoes, renderizarApp } from '@/test/utilidades'

const ANA = DEMO.contas[0].email
const BRUNO = DEMO.contas[1].email

/** Gera um CPF válido a partir de 9 dígitos (dados de teste inventados). */
function gerarCpf(base: string) {
  const dv = (s: string, peso: number) => {
    const r = (s.split('').reduce((a, n, i) => a + Number(n) * (peso - i), 0) * 10) % 11
    return r === 10 ? 0 : r
  }
  const d1 = dv(base, 10)
  const d2 = dv(base + d1, 11)
  return `${base}${d1}${d2}`
}

async function preencherLogin(usuario: ReturnType<typeof renderizarApp>['usuario'], identificador: string, senha: string) {
  const campoId = await screen.findByLabelText(/E-mail ou CPF/)
  await usuario.clear(campoId)
  await usuario.type(campoId, identificador)
  const campoSenha = screen.getByLabelText(/^Senha/)
  await usuario.clear(campoSenha)
  await usuario.type(campoSenha, senha)
}

describe('Login (tela 01, STY002, ADR-21)', () => {
  it('não tem violações de acessibilidade', async () => {
    renderizarApp('/entrar')
    await screen.findByRole('heading', { name: 'Acesse sua conta' })
    await esperarSemViolacoes()
  })

  it('valida os campos antes de enviar', async () => {
    const { usuario } = renderizarApp('/entrar')
    await usuario.click(await screen.findByRole('button', { name: 'Entrar na plataforma' }))
    expect(await screen.findByText('Preencha este campo.')).toBeInTheDocument()
    expect(screen.getByText('Informe sua senha.')).toBeInTheDocument()
  })

  it('mostra mensagem genérica com senha errada', async () => {
    const { usuario } = renderizarApp('/entrar')
    await preencherLogin(usuario, BRUNO, 'errada')
    await usuario.click(screen.getByRole('button', { name: 'Entrar na plataforma' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail, CPF ou senha incorretos.')
  })

  it('pede captcha a partir da 3ª falha e bloqueia na 5ª', async () => {
    const { usuario } = renderizarApp('/entrar')
    await preencherLogin(usuario, BRUNO, 'errada')
    const entrar = () => usuario.click(screen.getByRole('button', { name: 'Entrar na plataforma' }))

    for (let i = 0; i < 3; i++) {
      await entrar()
      await screen.findByText('E-mail, CPF ou senha incorretos.')
    }
    await entrar()
    expect(await screen.findByText('Confirme que você não é um robô para continuar.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar na plataforma' })).toBeDisabled()

    await usuario.click(screen.getByRole('button', { name: 'Simular verificação' }))
    await entrar()
    await screen.findByText('E-mail, CPF ou senha incorretos.')
    await entrar()
    expect(await screen.findByText(/Tente de novo em/)).toHaveTextContent(/1[45]:\d\d/)
    expect(screen.getByRole('button', { name: 'Entrar na plataforma' })).toBeDisabled()
  })

  it('conta com 2FA pede o código e abre o perfil', async () => {
    const { usuario } = renderizarApp('/entrar')
    await preencherLogin(usuario, ANA, DEMO.senha)
    await usuario.click(screen.getByRole('button', { name: 'Entrar na plataforma' }))
    await screen.findByRole('heading', { name: 'Verificação em duas etapas' })
    await usuario.type(screen.getByLabelText('Dígito 1 de 6'), DEMO.codigo)
    expect(await screen.findByRole('heading', { name: 'Perfil' })).toBeInTheDocument()
  })

  it('conta sem 2FA entra direto e aceita CPF', async () => {
    const { usuario } = renderizarApp('/entrar')
    await preencherLogin(usuario, '111.444.777-35', DEMO.senha)
    await usuario.click(screen.getByRole('button', { name: 'Entrar na plataforma' }))
    expect(await screen.findByRole('heading', { name: 'Perfil' })).toBeInTheDocument()
  })
})

describe('Criar conta e verificar e-mail (telas 02 e 03, STY001)', () => {
  it('não tem violações de acessibilidade', async () => {
    renderizarApp('/criar-conta')
    await screen.findByRole('heading', { name: 'Criar sua conta' })
    await esperarSemViolacoes()
  })

  it('bloqueia menores de 18 anos e exige o aceite dos termos', async () => {
    const { usuario } = renderizarApp('/criar-conta')
    await usuario.type(await screen.findByLabelText(/Nascimento/), '01012015')
    await usuario.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(await screen.findByText('É preciso ter 18 anos ou mais para criar uma conta.')).toBeInTheDocument()
    expect(screen.getByText('Aceite os Termos de Uso e a Política de Privacidade para continuar.')).toBeInTheDocument()
  })

  it('mostra os critérios de senha conforme a digitação', async () => {
    const { usuario } = renderizarApp('/criar-conta')
    const lista = await screen.findByRole('list', { name: 'Requisitos da senha' })
    await usuario.type(screen.getByLabelText(/^Senha/), 'abc1')
    expect(within(lista).getByText(/Número/)).toHaveTextContent('(atendido)')
    expect(within(lista).getByText(/Letra maiúscula/)).toHaveTextContent('(pendente)')
  })

  it('cria a conta, verifica o e-mail e entra', { timeout: 30_000 }, async () => {
    const { usuario } = renderizarApp('/criar-conta')
    await usuario.type(await screen.findByLabelText(/Nome completo/), 'Carla Mendes')
    await usuario.type(screen.getByLabelText(/^E-mail/), 'carla.mendes@exemplo.com')
    await usuario.type(screen.getByLabelText(/^CPF/), gerarCpf('987654321'))
    await usuario.type(screen.getByLabelText(/Nascimento/), '12051994')
    await usuario.type(screen.getByLabelText(/^Senha/), 'Senha@Forte1')
    await usuario.type(screen.getByLabelText(/Confirmar senha/), 'Senha@Forte1')
    await usuario.click(screen.getByRole('button', { name: 'Simular verificação' }))
    await usuario.click(screen.getByRole('checkbox', { name: /Li e aceito/ }))
    await usuario.click(screen.getByRole('button', { name: 'Criar conta' }))

    await screen.findByRole('heading', { name: 'Verifique seu e-mail' })
    expect(screen.getByText('carla.mendes@exemplo.com')).toBeInTheDocument()
    await usuario.type(screen.getByLabelText('Dígito 1 de 6'), DEMO.codigo)
    // Na suíte completa, a primeira carga do layout e do perfil pode passar de 5 s.
    expect(await screen.findByRole('heading', { name: 'Perfil' }, { timeout: 15_000 })).toBeInTheDocument()
    expect(screen.getByText('Conta criada! Você ganhou moedas de boas-vindas.')).toBeInTheDocument()
  })

  it('avisa quando o e-mail ou CPF já tem conta', async () => {
    const { usuario } = renderizarApp('/criar-conta')
    await usuario.type(await screen.findByLabelText(/Nome completo/), 'Ana Pereira')
    await usuario.type(screen.getByLabelText(/^E-mail/), ANA)
    await usuario.type(screen.getByLabelText(/^CPF/), '52998224725')
    await usuario.type(screen.getByLabelText(/Nascimento/), '12051994')
    await usuario.type(screen.getByLabelText(/^Senha/), 'Senha@Forte1')
    await usuario.type(screen.getByLabelText(/Confirmar senha/), 'Senha@Forte1')
    await usuario.click(screen.getByRole('button', { name: 'Simular verificação' }))
    await usuario.click(screen.getByRole('checkbox', { name: /Li e aceito/ }))
    await usuario.click(screen.getByRole('button', { name: 'Criar conta' }))
    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Já existe uma conta com este e-mail ou CPF.')
    expect(within(alerta).getByRole('link', { name: 'recuperar a senha' })).toHaveAttribute('href', '/recuperar-senha')
  })
})

describe('Recuperar e redefinir senha (tela 04, STY005)', () => {
  it('mostra confirmação neutra e redefine a senha pelo link', async () => {
    const { usuario } = renderizarApp('/recuperar-senha')
    await usuario.type(await screen.findByLabelText(/^E-mail/), BRUNO)
    await usuario.click(screen.getByRole('button', { name: 'Simular verificação' }))
    await usuario.click(screen.getByRole('button', { name: 'Enviar link de redefinição' }))
    expect(await screen.findByText(/Se houver uma conta com/)).toBeInTheDocument()

    await usuario.click(screen.getByRole('link', { name: 'Abrir o link de demonstração' }))
    await screen.findByRole('heading', { name: 'Criar nova senha' })
    await usuario.type(screen.getByLabelText(/^Nova senha/), DEMO.senha)
    await usuario.type(screen.getByLabelText(/Confirmar nova senha/), DEMO.senha)
    await usuario.click(screen.getByRole('button', { name: 'Salvar nova senha' }))
    expect(await screen.findByText('Escolha uma senha que você não usou recentemente.')).toBeInTheDocument()
  })

  it('link sem token mostra estado de link inválido', async () => {
    renderizarApp('/redefinir-senha')
    expect(await screen.findByRole('heading', { name: 'Este link não vale mais' })).toBeInTheDocument()
  })
})

describe('Entrar com código (tela 05, STY006)', () => {
  it('pede o e-mail com captcha e entra com o código', async () => {
    const { usuario } = renderizarApp('/entrar-com-codigo')
    await usuario.type(await screen.findByLabelText(/^E-mail/), BRUNO)
    await usuario.click(screen.getByRole('button', { name: 'Simular verificação' }))
    await usuario.click(screen.getByRole('button', { name: 'Enviar código' }))
    await screen.findByRole('heading', { name: 'Digite o código' })
    await esperarSemViolacoes()
    await usuario.type(screen.getByLabelText('Dígito 1 de 6'), DEMO.codigo)
    expect(await screen.findByRole('heading', { name: 'Perfil' })).toBeInTheDocument()
  })
})
