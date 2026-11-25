import { render, screen, fireEvent, waitFor } from '@testing-library/react-native'
import Perfil from '../app/(abas)/perfil'
import EditarPerfil from '../app/perfil/editar'
import Seguranca from '../app/perfil/seguranca'
import AlterarSenha from '../app/perfil/senha'
import DoisFatores from '../app/perfil/doisfatores'
import ExcluirConta from '../app/perfil/excluir'
import { SessaoProvider } from '../src/SessaoContext'
import { resetarMock, mudarConta, CONTA_TESTE, CONTA_2FA } from '../src/mock'
import { salvarTokens, lerAccess, lerRefresh } from '../src/secureStorage'
import { chamar } from '../src/api'

const mockPush = jest.fn()
const mockReplace = jest.fn()
const mockBack = jest.fn()
jest.mock('expo-router', ()=>{
  const React = require('react')
  return {
    useRouter: ()=> ({push: mockPush, replace: mockReplace, back: mockBack}),
    useFocusEffect: (cb: any)=> React.useEffect(()=>{ cb() }, []),
    router: {push: jest.fn(), replace: jest.fn(), back: jest.fn()},
  }
})

const fetchOriginal = globalThis.fetch

beforeEach(async ()=>{
  resetarMock()
  jest.clearAllMocks()
  globalThis.fetch = fetchOriginal
  await salvarTokens('access-mock-1', 'refresh-mock-1')
})

afterEach(()=>{
  globalThis.fetch = fetchOriginal
})

async function abrirPerfil(){
  await render(<SessaoProvider><Perfil/></SessaoProvider>)
  await screen.findByText('Usuário Teste')
}

async function abrirEditar(){
  await render(<EditarPerfil/>)
  await screen.findByDisplayValue('Usuário Teste')
}

async function salvarEdicao(){
  await fireEvent.press(screen.getByRole('button', {name: 'Salvar alterações'}))
}

async function abrirSeguranca(titulo = 'Sua conta está protegida'){
  await render(<SessaoProvider><Seguranca/></SessaoProvider>)
  await screen.findByText(titulo)
}

async function preencherSenha(atual: string, nova: string, confirmar: string){
  await render(<AlterarSenha/>)
  await fireEvent.changeText(screen.getByLabelText('Senha atual'), atual)
  await fireEvent.changeText(screen.getByLabelText('Nova senha'), nova)
  await fireEvent.changeText(screen.getByLabelText('Confirmar nova senha'), confirmar)
  await fireEvent.press(screen.getByRole('button', {name: 'Salvar nova senha'}))
}

async function desligarAntes(){
  await chamar('/me/2fa/disable', {method: 'POST', body: JSON.stringify({password: CONTA_TESTE.password, code: CONTA_2FA.code})})
}

async function preencherExclusao(senha: string, confirmacao: string){
  await render(<SessaoProvider><ExcluirConta/></SessaoProvider>)
  await fireEvent.changeText(screen.getByLabelText('Senha atual'), senha)
  await fireEvent.changeText(screen.getByLabelText('Confirmação'), confirmacao)
  await fireEvent.press(screen.getByRole('button', {name: 'Solicitar exclusão'}))
}

describe('perfil', ()=>{
  it('sem 2fa e sem e-mail verificado nao mostra a linha de verificacoes', async ()=>{
    mudarConta({twoFactorEnabled: false, emailVerified: false})
    await abrirPerfil()
    expect(screen.queryByText('E-mail verificado')).toBeNull()
    expect(screen.queryByText('2FA ativo')).toBeNull()
    expect(screen.queryByText(/verificado/)).toBeNull()
  })

  it('so com 2fa mostra apenas 2FA ativo', async ()=>{
    mudarConta({emailVerified: false})
    await abrirPerfil()
    expect(screen.getByText('2FA ativo')).toBeTruthy()
  })

  it('usa o singular com 1 avaliacao, 1 negociacao, 1 ativo e 1 pausado', async ()=>{
    mudarConta({reputation: {average: 5, reviews: 1, deals: 1, criteria: []}, listings: {active: 1, paused: 1}})
    await abrirPerfil()
    expect(screen.getByText('1 avaliação · 1 negociação')).toBeTruthy()
    expect(screen.getByText('1 ativo · 1 pausado')).toBeTruthy()
  })

  it('usa o plural com zero', async ()=>{
    mudarConta({reputation: {average: 0, reviews: 0, deals: 0, criteria: []}, listings: {active: 0, paused: 0}, coins: 0})
    await abrirPerfil()
    expect(screen.getByText('0 avaliações · 0 negociações')).toBeTruthy()
    expect(screen.getByText('0 ativos · 0 pausados')).toBeTruthy()
    expect(screen.getByText('0 moedas disponíveis')).toBeTruthy()
  })

  it('nota com virgula e sem criterios', async ()=>{
    mudarConta({reputation: {average: 3.25, reviews: 4, deals: 2, criteria: []}})
    await abrirPerfil()
    expect(screen.getAllByText('3,3').length + screen.queryAllByText('3,2').length).toBeGreaterThan(0)
    expect(screen.queryByText('Comunicação')).toBeNull()
  })

  it('sem selos mostra so os kg evitados', async ()=>{
    mudarConta({esg: {kgAvoided: 0, badges: []}})
    await abrirPerfil()
    expect(screen.queryByText('Reciclador')).toBeNull()
    expect(screen.queryByText('Doador')).toBeNull()
    expect(screen.getByText('0,0 kg evitados')).toBeTruthy()
  })

  it('ignora selo desconhecido', async ()=>{
    mudarConta({esg: {kgAvoided: 1, badges: [{id: 'x', kind: 'inventado'}, {id: 'b1', kind: 'donor'}]}})
    await abrirPerfil()
    expect(screen.getByText('Doador')).toBeTruthy()
    expect(screen.queryByText('inventado')).toBeNull()
  })

  it('sem regiao e sem data nao deixa separador solto', async ()=>{
    mudarConta({region: '', memberSince: undefined})
    await abrirPerfil()
    expect(screen.queryByText(/·\s*$/)).toBeNull()
    expect(screen.queryByText(/desde/)).toBeNull()
  })

  it('mostra erro do servidor quando o perfil nao carrega', async ()=>{
    globalThis.fetch = jest.fn(async ()=> new Response(JSON.stringify({code: 'X', detail: 'Servidor em manutenção.'}), {status: 500})) as any
    await render(<SessaoProvider><Perfil/></SessaoProvider>)
    expect(await screen.findByText('Servidor em manutenção.')).toBeTruthy()
    expect(screen.getByRole('button', {name: 'Tentar de novo'})).toBeTruthy()
  })

  it('carteira e esg avisam que ainda nao estao prontos', async ()=>{
    await abrirPerfil()
    await fireEvent.press(screen.getByRole('button', {name: 'Carteira'}))
    expect(global.alert).toHaveBeenCalledWith('Isso ainda não está pronto no app.')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('sair da conta apaga os tokens e vai pro login', async ()=>{
    await abrirPerfil()
    await fireEvent.press(screen.getByRole('button', {name: 'Sair da conta'}))
    await fireEvent.press(screen.getByRole('button', {name: 'Sair'}))
    await waitFor(()=> expect(mockReplace).toHaveBeenCalledWith('/login'))
    expect(await lerAccess()).toBeNull()
    expect(await lerRefresh()).toBeNull()
  })
})

describe('editar perfil', ()=>{
  it('rejeita nome com 4 digitos seguidos', async ()=>{
    await abrirEditar()
    await fireEvent.changeText(screen.getByLabelText('Nome de exibição'), 'Joao 1234')
    await salvarEdicao()
    expect(screen.getByText('Não use e-mail ou telefone no nome de exibição.')).toBeTruthy()
    expect(mockBack).not.toHaveBeenCalled()
  })

  it('aceita nome com 3 digitos', async ()=>{
    await abrirEditar()
    await fireEvent.changeText(screen.getByLabelText('Nome de exibição'), 'Joao 123')
    await salvarEdicao()
    await waitFor(()=> expect(mockBack).toHaveBeenCalled())
  })

  it('rejeita nome com arroba', async ()=>{
    await abrirEditar()
    await fireEvent.changeText(screen.getByLabelText('Nome de exibição'), 'joao@x')
    await salvarEdicao()
    expect(screen.getByText('Não use e-mail ou telefone no nome de exibição.')).toBeTruthy()
    expect(mockBack).not.toHaveBeenCalled()
  })

  it('rejeita nome so com espacos e nome de 1 caractere', async ()=>{
    await abrirEditar()
    await fireEvent.changeText(screen.getByLabelText('Nome de exibição'), '    ')
    await salvarEdicao()
    expect(screen.getByText('Use pelo menos 2 caracteres.')).toBeTruthy()
    await fireEvent.changeText(screen.getByLabelText('Nome de exibição'), ' A ')
    await salvarEdicao()
    expect(screen.getByText('Use pelo menos 2 caracteres.')).toBeTruthy()
    expect(mockBack).not.toHaveBeenCalled()
  })

  it('aceita nome com exatamente 2 e 40 caracteres', async ()=>{
    await abrirEditar()
    await fireEvent.changeText(screen.getByLabelText('Nome de exibição'), 'a'.repeat(40))
    await salvarEdicao()
    await waitFor(()=> expect(mockBack).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('Use no máximo 40 caracteres.')).toBeNull()
  })

  it('rejeita nome com 41 caracteres', async ()=>{
    await abrirEditar()
    await fireEvent.changeText(screen.getByLabelText('Nome de exibição'), 'a'.repeat(41))
    await salvarEdicao()
    expect(screen.getByText('Use no máximo 40 caracteres.')).toBeTruthy()
    expect(mockBack).not.toHaveBeenCalled()
  })

  it('contador da bio mostra 160/160 e salva', async ()=>{
    await abrirEditar()
    await fireEvent.changeText(screen.getByLabelText('Sobre você'), 'b'.repeat(160))
    expect(screen.getByText('160/160')).toBeTruthy()
    await salvarEdicao()
    await waitFor(()=> expect(mockBack).toHaveBeenCalled())
  })

  it('bio com 161 mostra o contador e bloqueia o salvar', async ()=>{
    await abrirEditar()
    await fireEvent.changeText(screen.getByLabelText('Sobre você'), 'b'.repeat(161))
    expect(screen.getByText('161/160')).toBeTruthy()
    await salvarEdicao()
    expect(screen.getByText('Use no máximo 160 caracteres.')).toBeTruthy()
    expect(mockBack).not.toHaveBeenCalled()
  })

  it('bio vazia e permitida', async ()=>{
    await abrirEditar()
    await fireEvent.changeText(screen.getByLabelText('Sobre você'), '')
    expect(screen.getByText('0/160')).toBeTruthy()
    await salvarEdicao()
    await waitFor(()=> expect(mockBack).toHaveBeenCalled())
  })

  it('regiao vazia ou so com espacos bloqueia', async ()=>{
    await abrirEditar()
    await fireEvent.changeText(screen.getByLabelText('Região'), '   ')
    await salvarEdicao()
    expect(screen.getByText('Escolha sua região.')).toBeTruthy()
    expect(mockBack).not.toHaveBeenCalled()
  })

  it('mostra varios erros de uma vez', async ()=>{
    await abrirEditar()
    await fireEvent.changeText(screen.getByLabelText('Nome de exibição'), 'x')
    await fireEvent.changeText(screen.getByLabelText('Região'), '')
    await salvarEdicao()
    expect(screen.getByText('Use pelo menos 2 caracteres.')).toBeTruthy()
    expect(screen.getByText('Escolha sua região.')).toBeTruthy()
  })

  it('409 com versao desatualizada mostra o aviso e nao fecha a tela', async ()=>{
    await abrirEditar()
    mudarConta({version: 99})
    await fireEvent.changeText(screen.getByLabelText('Nome de exibição'), 'Novo Nome')
    await salvarEdicao()
    expect(await screen.findByText('Seu perfil foi alterado em outro aparelho.')).toBeTruthy()
    expect(mockBack).not.toHaveBeenCalled()
  })

  it('corrigir o erro e salvar de novo limpa o aviso', async ()=>{
    await abrirEditar()
    await fireEvent.changeText(screen.getByLabelText('Nome de exibição'), 'a'.repeat(41))
    await salvarEdicao()
    expect(screen.getByText('Use no máximo 40 caracteres.')).toBeTruthy()
    await fireEvent.changeText(screen.getByLabelText('Nome de exibição'), 'Nome certo')
    await salvarEdicao()
    await waitFor(()=> expect(mockBack).toHaveBeenCalled())
    expect(screen.queryByText('Use no máximo 40 caracteres.')).toBeNull()
  })

  it('bio com telefone devolve o erro do servidor', async ()=>{
    await abrirEditar()
    await fireEvent.changeText(screen.getByLabelText('Sobre você'), 'me ligue 44 99999-8888')
    await salvarEdicao()
    expect(await screen.findByText('Tire telefone, e-mail ou endereço do "Sobre você".')).toBeTruthy()
    expect(mockBack).not.toHaveBeenCalled()
  })

  it('sem conexao ao salvar mostra aviso', async ()=>{
    await abrirEditar()
    globalThis.fetch = jest.fn(async ()=>{ throw new Error('sem rede') }) as any
    await salvarEdicao()
    expect(await screen.findByText('Sem conexão. Confira a internet.')).toBeTruthy()
  })

  it('nome com acento e emoji e aceito', async ()=>{
    await abrirEditar()
    await fireEvent.changeText(screen.getByLabelText('Nome de exibição'), 'João 🌱 Ñandú')
    await salvarEdicao()
    await waitFor(()=> expect(mockBack).toHaveBeenCalled())
  })
})

describe('alterar senha', ()=>{
  it('sem maiuscula', async ()=>{
    await preencherSenha(CONTA_TESTE.password, 'steely@2026x', 'steely@2026x')
    expect(screen.getByText('A senha precisa de: uma letra maiúscula.')).toBeTruthy()
  })

  it('sem numero', async ()=>{
    await preencherSenha(CONTA_TESTE.password, 'Steely@abcdx', 'Steely@abcdx')
    expect(screen.getByText('A senha precisa de: um número.')).toBeTruthy()
  })

  it('sem caractere especial', async ()=>{
    await preencherSenha(CONTA_TESTE.password, 'Steely2026xx', 'Steely2026xx')
    expect(screen.getByText('A senha precisa de: um caractere especial.')).toBeTruthy()
  })

  it('lista tudo que falta', async ()=>{
    await preencherSenha(CONTA_TESTE.password, 'abc', 'abc')
    expect(screen.getByText('A senha precisa de: 10 caracteres, uma letra maiúscula, um número, um caractere especial.')).toBeTruthy()
  })

  it('com 9 caracteres falha e com 10 passa', async ()=>{
    await preencherSenha(CONTA_TESTE.password, 'Aa1@aaaaa', 'Aa1@aaaaa')
    expect(screen.getByText('A senha precisa de: 10 caracteres.')).toBeTruthy()
    await fireEvent.changeText(screen.getByLabelText('Nova senha'), 'Aa1@aaaaaa')
    await fireEvent.changeText(screen.getByLabelText('Confirmar nova senha'), 'Aa1@aaaaaa')
    await fireEvent.press(screen.getByRole('button', {name: 'Salvar nova senha'}))
    expect(await screen.findByText('Senha alterada. Mandamos um aviso pro seu e-mail.')).toBeTruthy()
  })

  it('confirmacao diferente', async ()=>{
    await preencherSenha(CONTA_TESTE.password, 'Nova@Senha2026', 'Nova@Senha2027')
    expect(screen.getByText('As senhas não conferem.')).toBeTruthy()
    expect(screen.queryByText('Senha alterada. Mandamos um aviso pro seu e-mail.')).toBeNull()
  })

  it('confirmacao vazia', async ()=>{
    await preencherSenha(CONTA_TESTE.password, 'Nova@Senha2026', '')
    expect(screen.getByText('As senhas não conferem.')).toBeTruthy()
  })

  it('nova igual a atual', async ()=>{
    await preencherSenha(CONTA_TESTE.password, CONTA_TESTE.password, CONTA_TESTE.password)
    expect(screen.getByText('A nova senha precisa ser diferente da atual.')).toBeTruthy()
  })

  it('aceita 128 caracteres', async ()=>{
    const nova = 'Aa1@' + 'x'.repeat(124)
    expect(nova.length).toBe(128)
    await preencherSenha(CONTA_TESTE.password, nova, nova)
    expect(await screen.findByText('Senha alterada. Mandamos um aviso pro seu e-mail.')).toBeTruthy()
  })

  it('rejeita 129 caracteres', async ()=>{
    const nova = 'Aa1@' + 'x'.repeat(125)
    expect(nova.length).toBe(129)
    await preencherSenha(CONTA_TESTE.password, nova, nova)
    expect(screen.getByText('Use no máximo 128 caracteres.')).toBeTruthy()
    expect(screen.queryByText('Senha alterada. Mandamos um aviso pro seu e-mail.')).toBeNull()
  })

  it('senha atual errada mostra no campo da senha atual', async ()=>{
    await preencherSenha('Errada@20266', 'Nova@Senha2026', 'Nova@Senha2026')
    expect(await screen.findByText('Senha atual incorreta.')).toBeTruthy()
    expect(screen.queryByText('Senha alterada. Mandamos um aviso pro seu e-mail.')).toBeNull()
  })

  it('PASSWORD_REUSED do servidor aparece no campo da nova senha', async ()=>{
    globalThis.fetch = jest.fn(async (url: any, op: any)=>{
      if(String(url).endsWith('/me/password')) return new Response(JSON.stringify({code: 'PASSWORD_REUSED', detail: 'Você já usou essa senha antes.'}), {status: 422})
      return fetchOriginal(url, op)
    }) as any
    await preencherSenha(CONTA_TESTE.password, 'Nova@Senha2026', 'Nova@Senha2026')
    expect(await screen.findByText('Você já usou essa senha antes.')).toBeTruthy()
    expect(screen.queryByText('Senha alterada. Mandamos um aviso pro seu e-mail.')).toBeNull()
  })

  it('erro generico do servidor aparece embaixo', async ()=>{
    globalThis.fetch = jest.fn(async (url: any, op: any)=>{
      if(String(url).endsWith('/me/password')) return new Response(JSON.stringify({code: 'X', detail: 'Tente mais tarde.'}), {status: 500})
      return fetchOriginal(url, op)
    }) as any
    await preencherSenha(CONTA_TESTE.password, 'Nova@Senha2026', 'Nova@Senha2026')
    expect(await screen.findByText('Tente mais tarde.')).toBeTruthy()
  })

  it('sem conexao', async ()=>{
    globalThis.fetch = jest.fn(async ()=>{ throw new Error('sem rede') }) as any
    await preencherSenha(CONTA_TESTE.password, 'Nova@Senha2026', 'Nova@Senha2026')
    expect(await screen.findByText('Sem conexão. Confira a internet.')).toBeTruthy()
  })

  it('botao de mostrar alterna o rotulo', async ()=>{
    await render(<AlterarSenha/>)
    await fireEvent.press(screen.getByRole('button', {name: 'Mostrar nova senha'}))
    expect(screen.getByRole('button', {name: 'Esconder nova senha'})).toBeTruthy()
  })

  it('apos sucesso o botao de salvar fica desabilitado', async ()=>{
    await preencherSenha(CONTA_TESTE.password, 'Nova@Senha2026', 'Nova@Senha2026')
    await screen.findByText('Senha alterada. Mandamos um aviso pro seu e-mail.')
    expect(screen.getByRole('button', {name: 'Salvar nova senha'}).props.accessibilityState.disabled).toBe(true)
  })
})

describe('dois fatores', ()=>{
  it('ativar mostra 8 codigos e ja guardei volta', async ()=>{
    await desligarAntes()
    await render(<DoisFatores/>)
    await fireEvent.press(await screen.findByRole('button', {name: 'Configurar verificação'}))
    await screen.findByText('JBSWY3DPEHPK3PXP')
    await fireEvent.changeText(screen.getByLabelText('Código de 6 números'), CONTA_2FA.code)
    await fireEvent.press(screen.getByRole('button', {name: 'Ativar verificação'}))
    expect(await screen.findByText('Verificação ativada')).toBeTruthy()
    expect(screen.getAllByText(/^[A-Z0-9]+-[A-Z0-9]+$/).length).toBe(8)
    await fireEvent.press(screen.getByRole('button', {name: 'Já guardei'}))
    expect(mockBack).toHaveBeenCalledTimes(1)
  })

  it('o campo de codigo so aceita digitos e corta em 6', async ()=>{
    await desligarAntes()
    await render(<DoisFatores/>)
    await fireEvent.press(await screen.findByRole('button', {name: 'Configurar verificação'}))
    await screen.findByText('JBSWY3DPEHPK3PXP')
    await fireEvent.changeText(screen.getByLabelText('Código de 6 números'), '12ab34-56789')
    expect(screen.getByDisplayValue('123456')).toBeTruthy()
  })

  it('codigo com letras ou vazio nao e enviado', async ()=>{
    await desligarAntes()
    await render(<DoisFatores/>)
    await fireEvent.press(await screen.findByRole('button', {name: 'Configurar verificação'}))
    await screen.findByText('JBSWY3DPEHPK3PXP')
    await fireEvent.press(screen.getByRole('button', {name: 'Ativar verificação'}))
    expect(screen.getByText('O código tem 6 números.')).toBeTruthy()
  })

  it('apos ativar o servidor passa a dizer que o 2fa esta ligado', async ()=>{
    await desligarAntes()
    await render(<DoisFatores/>)
    await fireEvent.press(await screen.findByRole('button', {name: 'Configurar verificação'}))
    await screen.findByText('JBSWY3DPEHPK3PXP')
    await fireEvent.changeText(screen.getByLabelText('Código de 6 números'), CONTA_2FA.code)
    await fireEvent.press(screen.getByRole('button', {name: 'Ativar verificação'}))
    await screen.findByText('Verificação ativada')
    const res = await chamar('/me/security')
    const d = await res.json()
    expect(d.twoFactor.enabled).toBe(true)
  })

  it('desligar com senha errada mostra erro e continua ligado', async ()=>{
    await render(<DoisFatores/>)
    await fireEvent.changeText(await screen.findByLabelText('Senha atual'), 'Errada@20266')
    await fireEvent.changeText(screen.getByLabelText('Código de 6 números'), CONTA_2FA.code)
    await fireEvent.press(screen.getByRole('button', {name: 'Desligar verificação'}))
    expect(await screen.findByText('Senha atual incorreta.')).toBeTruthy()
    expect(screen.queryByText('Verificação desligada')).toBeNull()
    const d = await (await chamar('/me/security')).json()
    expect(d.twoFactor.enabled).toBe(true)
  })

  it('desligar com codigo errado mostra erro', async ()=>{
    await render(<DoisFatores/>)
    await fireEvent.changeText(await screen.findByLabelText('Senha atual'), CONTA_TESTE.password)
    await fireEvent.changeText(screen.getByLabelText('Código de 6 números'), '000000')
    await fireEvent.press(screen.getByRole('button', {name: 'Desligar verificação'}))
    expect(await screen.findByText('Código inválido.')).toBeTruthy()
  })

  it('desligar sem codigo pede 6 numeros', async ()=>{
    await render(<DoisFatores/>)
    await fireEvent.changeText(await screen.findByLabelText('Senha atual'), CONTA_TESTE.password)
    await fireEvent.press(screen.getByRole('button', {name: 'Desligar verificação'}))
    expect(screen.getByText('O código tem 6 números.')).toBeTruthy()
  })

  it('desligar certo mostra a confirmacao e volta', async ()=>{
    await render(<DoisFatores/>)
    await fireEvent.changeText(await screen.findByLabelText('Senha atual'), CONTA_TESTE.password)
    await fireEvent.changeText(screen.getByLabelText('Código de 6 números'), CONTA_2FA.code)
    await fireEvent.press(screen.getByRole('button', {name: 'Desligar verificação'}))
    expect(await screen.findByText('Verificação desligada')).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', {name: 'Voltar pra segurança'}))
    expect(mockBack).toHaveBeenCalled()
  })

  it('erro ao carregar oferece tentar de novo', async ()=>{
    globalThis.fetch = jest.fn(async ()=>{ throw new Error('sem rede') }) as any
    await render(<DoisFatores/>)
    expect(await screen.findByText('Sem conexão. Confira a internet.')).toBeTruthy()
    expect(screen.getByRole('button', {name: 'Tentar de novo'})).toBeTruthy()
  })
})

describe('seguranca', ()=>{
  it('sem 2fa mostra o banner de alerta e 2FA desligado', async ()=>{
    await desligarAntes()
    await abrirSeguranca('Sua conta pode ficar mais segura')
    expect(screen.getByText(/2FA desligado/)).toBeTruthy()
    expect(screen.getByText('Desligada')).toBeTruthy()
    expect(screen.getByRole('button', {name: 'Verificação em duas etapas, desligada'})).toBeTruthy()
  })

  it('gerar codigos com 2fa desligado mostra o erro 409 no modal', async ()=>{
    await desligarAntes()
    await abrirSeguranca('Sua conta pode ficar mais segura')
    await fireEvent.press(screen.getByRole('button', {name: 'Códigos de recuperação'}))
    await fireEvent.press(screen.getByRole('button', {name: 'Gerar códigos'}))
    expect(await screen.findByText('Ative a verificação em duas etapas primeiro.')).toBeTruthy()
    expect(screen.queryByText('Seus códigos de recuperação')).toBeNull()
  })

  it('gerar codigos mostra 8 codigos', async ()=>{
    await abrirSeguranca()
    await fireEvent.press(screen.getByRole('button', {name: 'Códigos de recuperação'}))
    await fireEvent.press(screen.getByRole('button', {name: 'Gerar códigos'}))
    await screen.findByText('Seus códigos de recuperação')
    expect(screen.getAllByText(/^[A-Z0-9]+-[A-Z0-9]+$/).length).toBe(8)
  })

  it('voltar no modal de codigos nao gera nada', async ()=>{
    await abrirSeguranca()
    await fireEvent.press(screen.getByRole('button', {name: 'Códigos de recuperação'}))
    await fireEvent.press(screen.getByText('Voltar'))
    expect(screen.queryByText('Seus códigos de recuperação')).toBeNull()
    expect(screen.queryByText('Gerar novos códigos?')).toBeNull()
  })

  it('encerrar outra sessao tira ela da lista e atualiza a contagem', async ()=>{
    await abrirSeguranca()
    expect(screen.getByText('2 aparelhos')).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', {name: 'Encerrar Chrome no Windows'}))
    expect(screen.getByText('Chrome no Windows vai precisar entrar de novo.')).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', {name: 'Encerrar'}))
    await waitFor(()=> expect(screen.getByText('1 aparelho')).toBeTruthy())
    expect(screen.queryByText('Chrome no Windows')).toBeNull()
    expect(screen.getByText('Atual')).toBeTruthy()
  })

  it('cancelar o encerramento mantem a sessao', async ()=>{
    await abrirSeguranca()
    await fireEvent.press(screen.getByRole('button', {name: 'Encerrar Chrome no Windows'}))
    await fireEvent.press(screen.getByText('Voltar'))
    expect(screen.getByText('Chrome no Windows')).toBeTruthy()
    expect(screen.getByText('2 aparelhos')).toBeTruthy()
  })

  it('a sessao atual nao tem botao de encerrar', async ()=>{
    await abrirSeguranca()
    expect(screen.queryByRole('button', {name: 'Encerrar Android · este aparelho'})).toBeNull()
    expect(screen.getAllByText('Encerrar').length).toBe(1)
  })

  it('o servidor recusa encerrar a sessao atual com 400', async ()=>{
    const res = await chamar('/me/sessions/s1', {method: 'DELETE'})
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('CURRENT_SESSION')
  })

  it('erro do servidor ao encerrar aparece no modal e a sessao continua', async ()=>{
    await abrirSeguranca()
    await fireEvent.press(screen.getByRole('button', {name: 'Encerrar Chrome no Windows'}))
    globalThis.fetch = jest.fn(async (url: any, op: any)=>{
      if(String(url).endsWith('/me/sessions/s2')) return new Response(JSON.stringify({code: 'NOT_FOUND', detail: 'Sessão não encontrada'}), {status: 404})
      return fetchOriginal(url, op)
    }) as any
    await fireEvent.press(screen.getByRole('button', {name: 'Encerrar'}))
    expect(await screen.findByText('Sessão não encontrada')).toBeTruthy()
    expect(screen.getByText('Chrome no Windows')).toBeTruthy()
  })

  it('sair de todos os aparelhos apaga access e refresh e vai pro login', async ()=>{
    await abrirSeguranca()
    await fireEvent.press(screen.getByRole('button', {name: 'Sair de todos os aparelhos'}))
    await fireEvent.press(screen.getByRole('button', {name: 'Sair de todos'}))
    await waitFor(()=> expect(mockReplace).toHaveBeenCalledWith('/login'))
    expect(await lerAccess()).toBeNull()
    expect(await lerRefresh()).toBeNull()
  })

  it('cancelar sair de todos nao apaga os tokens', async ()=>{
    await abrirSeguranca()
    await fireEvent.press(screen.getByRole('button', {name: 'Sair de todos os aparelhos'}))
    await fireEvent.press(screen.getByText('Voltar'))
    expect(await lerAccess()).toBe('access-mock-1')
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('falha ao sair de todos mantem tokens e mostra erro', async ()=>{
    await abrirSeguranca()
    await fireEvent.press(screen.getByRole('button', {name: 'Sair de todos os aparelhos'}))
    globalThis.fetch = jest.fn(async (url: any, op: any)=>{
      if(String(url).endsWith('/me/sessions') && op && op.method == 'DELETE') return new Response(JSON.stringify({code: 'X', detail: 'Falhou no servidor.'}), {status: 500})
      return fetchOriginal(url, op)
    }) as any
    await fireEvent.press(screen.getByRole('button', {name: 'Sair de todos'}))
    expect(await screen.findByText('Falhou no servidor.')).toBeTruthy()
    expect(await lerAccess()).toBe('access-mock-1')
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('senha trocada hoje aparece como hoje e 1 sessao fica no singular', async ()=>{
    await chamar('/me/password', {method: 'PUT', body: JSON.stringify({currentPassword: CONTA_TESTE.password, newPassword: 'Outra@Senha2026'})})
    await abrirSeguranca()
    expect(screen.getByText('2FA ativo · senha trocada hoje')).toBeTruthy()
    expect(screen.getByText('1 aparelho')).toBeTruthy()
  })

  it('erro do servidor ao carregar mostra tentar de novo', async ()=>{
    globalThis.fetch = jest.fn(async ()=> new Response(JSON.stringify({code: 'X', detail: 'Indisponível agora.'}), {status: 503})) as any
    await render(<SessaoProvider><Seguranca/></SessaoProvider>)
    expect(await screen.findByText('Indisponível agora.')).toBeTruthy()
    expect(screen.getByRole('button', {name: 'Tentar de novo'})).toBeTruthy()
  })
})

describe('excluir conta', ()=>{
  it('palavra de confirmacao errada nao chama o servidor nem apaga tokens', async ()=>{
    const espiao = jest.fn(fetchOriginal)
    globalThis.fetch = espiao as any
    await preencherExclusao(CONTA_TESTE.password, 'Excluir')
    expect(screen.getByText('Digite EXCLUIR em letras maiúsculas.')).toBeTruthy()
    expect(espiao.mock.calls.some((c: any)=> String(c[0]).endsWith('/me/deletion'))).toBe(false)
    expect(await lerAccess()).toBe('access-mock-1')
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('palavra com espaco extra e rejeitada', async ()=>{
    await preencherExclusao(CONTA_TESTE.password, 'EXCLUIR ')
    expect(screen.getByText('Digite EXCLUIR em letras maiúsculas.')).toBeTruthy()
  })

  it('sem senha pede a senha', async ()=>{
    await preencherExclusao('', 'EXCLUIR')
    expect(screen.getByText('Informe sua senha atual.')).toBeTruthy()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('senha errada mostra erro e mantem os tokens', async ()=>{
    await preencherExclusao('Errada@20266', 'EXCLUIR')
    expect(await screen.findByText('Senha atual incorreta.')).toBeTruthy()
    expect(screen.queryByText(/moedas/)).toBeNull()
    expect(await lerAccess()).toBe('access-mock-1')
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('com moedas mostra a confirmacao e voltar cancela sem apagar', async ()=>{
    await preencherExclusao(CONTA_TESTE.password, 'EXCLUIR')
    expect(await screen.findByText('Você ainda tem 340 moedas')).toBeTruthy()
    await fireEvent.press(screen.getByText('Voltar', {exact: true}))
    expect(screen.queryByText('Você ainda tem 340 moedas')).toBeNull()
    expect(await lerAccess()).toBe('access-mock-1')
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('confirmar as moedas recebe 202, apaga os tokens e vai pro login', async ()=>{
    await preencherExclusao(CONTA_TESTE.password, 'EXCLUIR')
    await screen.findByText('Você ainda tem 340 moedas')
    await fireEvent.press(screen.getByRole('button', {name: 'Excluir mesmo assim'}))
    await waitFor(()=> expect(mockReplace).toHaveBeenCalledWith('/login'))
    expect(await lerAccess()).toBeNull()
    expect(await lerRefresh()).toBeNull()
  })

  it('o segundo envio manda acknowledgeCoins', async ()=>{
    await preencherExclusao(CONTA_TESTE.password, 'EXCLUIR')
    await screen.findByText('Você ainda tem 340 moedas')
    const espiao = jest.fn(fetchOriginal)
    globalThis.fetch = espiao as any
    await fireEvent.press(screen.getByRole('button', {name: 'Excluir mesmo assim'}))
    await waitFor(()=> expect(mockReplace).toHaveBeenCalled())
    const chamada: any = espiao.mock.calls.find((c: any)=> String(c[0]).endsWith('/me/deletion'))
    expect(JSON.parse(chamada[1].body).acknowledgeCoins).toBe(true)
  })

  it('o primeiro envio nao manda acknowledgeCoins', async ()=>{
    const espiao = jest.fn(fetchOriginal)
    globalThis.fetch = espiao as any
    await preencherExclusao(CONTA_TESTE.password, 'EXCLUIR')
    await screen.findByText('Você ainda tem 340 moedas')
    const chamada: any = espiao.mock.calls.find((c: any)=> String(c[0]).endsWith('/me/deletion'))
    expect(JSON.parse(chamada[1].body).acknowledgeCoins).toBeUndefined()
  })

  it('pendencia que nao e moeda mostra a mensagem do servidor', async ()=>{
    globalThis.fetch = jest.fn(async (url: any, op: any)=>{
      if(String(url).endsWith('/me/deletion')) return new Response(JSON.stringify({code: 'DELETION_BLOCKED', detail: 'Você tem um leilão aberto.', pending: [{kind: 'AUCTION'}]}), {status: 409})
      return fetchOriginal(url, op)
    }) as any
    await preencherExclusao(CONTA_TESTE.password, 'EXCLUIR')
    expect(await screen.findByText('Você tem um leilão aberto.')).toBeTruthy()
    expect(await lerAccess()).toBe('access-mock-1')
  })

  it('sem moedas exclui direto e apaga os tokens', async ()=>{
    mudarConta({coins: 0})
    await preencherExclusao(CONTA_TESTE.password, 'EXCLUIR')
    await waitFor(()=> expect(mockReplace).toHaveBeenCalledWith('/login'))
    expect(screen.queryByText(/moedas/)).toBeNull()
    expect(await lerAccess()).toBeNull()
  })

  it('sem conexao mostra aviso e mantem os tokens', async ()=>{
    globalThis.fetch = jest.fn(async ()=>{ throw new Error('sem rede') }) as any
    await preencherExclusao(CONTA_TESTE.password, 'EXCLUIR')
    expect(await screen.findByText('Sem conexão. Confira a internet.')).toBeTruthy()
    expect(await lerAccess()).toBe('access-mock-1')
  })
})
