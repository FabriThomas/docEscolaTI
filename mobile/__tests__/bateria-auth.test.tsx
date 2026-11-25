import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native'
import { Text } from 'react-native'
import Login from '../app/login'
import { SessaoProvider, useSessao } from '../src/SessaoContext'
import { chamar, cabecalhos, renovarToken, quandoExpirar, sessaoExpirou, URL_API } from '../src/api'
import { resetarMock, CONTA_TESTE, CONTA_2FA } from '../src/mock'
import { salvarTokens, lerAccess, lerRefresh, lerChavePublica, apagarChaves } from '../src/secureStorage'

const mockReplace = jest.fn()
const mockRouterReplace = jest.fn()
jest.mock('expo-router', ()=> ({
  useRouter: ()=> ({push: jest.fn(), replace: (r: any)=> mockReplace(r), back: jest.fn()}),
  router: {replace: (r: any)=> mockRouterReplace(r)},
}))

const fetchOriginal = globalThis.fetch
let chamadas: any[] = []

function trocarFetch(tratar: (url: string, opcoes: any, original: any)=> any){
  globalThis.fetch = (async (url: any, opcoes: any = {})=>{
    chamadas.push({url: String(url), opcoes})
    const r = await tratar(String(url), opcoes, fetchOriginal)
    if(r) return r
    return fetchOriginal(url, opcoes)
  }) as any
}

function json(status: number, corpo: any, headers: any = {}){
  return new Response(JSON.stringify(corpo), {status, headers: {'Content-Type': 'application/json', ...headers}})
}

beforeEach(async ()=>{
  jest.useRealTimers()
  globalThis.fetch = fetchOriginal
  resetarMock()
  jest.clearAllMocks()
  chamadas = []
  trocarFetch(()=> null)
  quandoExpirar(null)
  await apagarChaves()
})

afterEach(()=>{
  globalThis.fetch = fetchOriginal
  jest.useRealTimers()
})

async function abrir(){
  await render(<SessaoProvider><Login/></SessaoProvider>)
  await screen.findByText('Acesse sua conta')
}

async function tentar(identificador: string, senha: string){
  await fireEvent.changeText(screen.getByLabelText('E-mail ou CPF'), identificador)
  await fireEvent.changeText(screen.getByLabelText('Senha'), senha)
  await fireEvent.press(screen.getByRole('button', {name: 'Entrar na plataforma'}))
}

function loginsFeitos(){
  return chamadas.filter(c => c.url.endsWith('/auth/login'))
}

function MostraSessao(){
  const {usuario, carregando} = useSessao()
  if(carregando) return <Text>carregando</Text>
  return <Text>{usuario ? 'logado ' + usuario.id : 'deslogado'}</Text>
}

describe('login por cpf e campos', ()=>{
  it('aceita cpf com 11 digitos puros', async ()=>{
    trocarFetch((url)=> url.endsWith('/auth/login') ? json(401, {code: 'INVALID_CREDENTIALS'}) : null)
    await abrir()
    await tentar('12345678909', 'x')
    expect(await screen.findByText('E-mail, CPF ou senha incorretos.')).toBeTruthy()
    expect(loginsFeitos().length).toBe(1)
  })

  it('aceita cpf com mascara e manda como foi digitado', async ()=>{
    trocarFetch((url)=> url.endsWith('/auth/login') ? json(401, {code: 'INVALID_CREDENTIALS'}) : null)
    await abrir()
    await tentar('123.456.789-09', 'x')
    await screen.findByText('E-mail, CPF ou senha incorretos.')
    expect(JSON.parse(loginsFeitos()[0].opcoes.body).identifier).toBe('123.456.789-09')
  })

  it('rejeita cpf com 10 ou 12 digitos sem chamar a api', async ()=>{
    await abrir()
    await tentar('123.456.789-0', 'x')
    expect(screen.getByText('Informe um e-mail ou CPF válido.')).toBeTruthy()
    await tentar('123456789012', 'x')
    expect(screen.getByText('Informe um e-mail ou CPF válido.')).toBeTruthy()
    expect(loginsFeitos().length).toBe(0)
  })

  it('rejeita email sem dominio e email com espaco no meio', async ()=>{
    await abrir()
    await tentar('teste@steely', 'x')
    expect(screen.getByText('Informe um e-mail ou CPF válido.')).toBeTruthy()
    await tentar('te ste@steely.dev', 'x')
    expect(screen.getByText('Informe um e-mail ou CPF válido.')).toBeTruthy()
    expect(loginsFeitos().length).toBe(0)
  })

  it('tira espacos das pontas do email antes de enviar e entra', async ()=>{
    await abrir()
    await tentar('   ' + CONTA_TESTE.identifier + '  ', CONTA_TESTE.password)
    await waitFor(()=> expect(mockReplace).toHaveBeenCalledWith('/perfil'))
    expect(JSON.parse(loginsFeitos()[0].opcoes.body).identifier).toBe(CONTA_TESTE.identifier)
  })

  it('nao altera a senha digitada, nem espacos nas pontas', async ()=>{
    trocarFetch((url)=> url.endsWith('/auth/login') ? json(401, {code: 'INVALID_CREDENTIALS'}) : null)
    await abrir()
    await tentar(CONTA_TESTE.identifier, ' abc ')
    await screen.findByText('E-mail, CPF ou senha incorretos.')
    expect(JSON.parse(loginsFeitos()[0].opcoes.body).password).toBe(' abc ')
  })

  it('senha vazia mostra a mensagem de campo e nao chama a api', async ()=>{
    await abrir()
    await tentar(CONTA_TESTE.identifier, '')
    expect(screen.getByText('Preencha este campo.')).toBeTruthy()
    expect(loginsFeitos().length).toBe(0)
  })

  it('identificador vazio mostra a mensagem de identificador', async ()=>{
    await abrir()
    await tentar('', 'abc')
    expect(screen.getByText('Informe um e-mail ou CPF válido.')).toBeTruthy()
  })

  it('o erro some quando a proxima tentativa comeca', async ()=>{
    await abrir()
    await tentar('lixo', 'x')
    expect(screen.getByText('Informe um e-mail ou CPF válido.')).toBeTruthy()
    await tentar(CONTA_TESTE.identifier, CONTA_TESTE.password)
    expect(screen.queryByText('Informe um e-mail ou CPF válido.')).toBeNull()
    await waitFor(()=> expect(mockReplace).toHaveBeenCalledWith('/perfil'))
  })

  it('mostrar e esconder senha alterna o campo', async ()=>{
    await abrir()
    expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(true)
    await fireEvent.press(screen.getByRole('button', {name: 'Mostrar senha'}))
    expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(false)
    await fireEvent.press(screen.getByRole('button', {name: 'Esconder senha'}))
    expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(true)
  })

  it('sem conexao mostra a mensagem e libera o botao de novo', async ()=>{
    trocarFetch((url)=>{
      if(url.endsWith('/auth/login')) throw new Error('sem rede')
      return null
    })
    await abrir()
    await tentar(CONTA_TESTE.identifier, CONTA_TESTE.password)
    expect(await screen.findByText('Sem conexão. Confira a internet.')).toBeTruthy()
    expect(screen.getByRole('button', {name: 'Entrar na plataforma'})).toBeTruthy()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('resposta sem corpo json cai na mensagem generica', async ()=>{
    trocarFetch((url)=> url.endsWith('/auth/login') ? new Response('<html>', {status: 502}) : null)
    await abrir()
    await tentar(CONTA_TESTE.identifier, CONTA_TESTE.password)
    expect(await screen.findByText('E-mail, CPF ou senha incorretos.')).toBeTruthy()
  })
})

describe('mensagens de conta', ()=>{
  it('conta nao verificada pede para confirmar o email', async ()=>{
    trocarFetch((url)=> url.endsWith('/auth/login') ? json(403, {code: 'ACCOUNT_NOT_VERIFIED'}) : null)
    await abrir()
    await tentar(CONTA_TESTE.identifier, CONTA_TESTE.password)
    expect(await screen.findByText('Confirme seu e-mail antes de entrar.')).toBeTruthy()
    expect(await lerAccess()).toBeNull()
  })

  it('conta em periodo de exclusao manda falar com o suporte', async ()=>{
    trocarFetch((url)=> url.endsWith('/auth/login') ? json(403, {code: 'ACCOUNT_IN_GRACE_PERIOD'}) : null)
    await abrir()
    await tentar(CONTA_TESTE.identifier, CONTA_TESTE.password)
    expect(await screen.findByText('Sua conta está em exclusão. Fale com o suporte pra cancelar.')).toBeTruthy()
    expect(await lerAccess()).toBeNull()
  })
})

describe('bloqueio por tentativas', ()=>{
  it('mostra os minutos, desabilita o botao e libera depois do retry-after', async ()=>{
    jest.useFakeTimers()
    trocarFetch((url)=> url.endsWith('/auth/login') ? json(429, {code: 'LOGIN_LOCKED'}, {'Retry-After': '120'}) : null)
    await render(<SessaoProvider><Login/></SessaoProvider>)
    await screen.findByText('Acesse sua conta')
    await tentar(CONTA_TESTE.identifier, 'x')
    expect(await screen.findByText(/Tente de novo em 2 minutos/)).toBeTruthy()
    expect(loginsFeitos().length).toBe(1)

    await fireEvent.press(screen.getByRole('button', {name: 'Entrar na plataforma'}))
    expect(loginsFeitos().length).toBe(1)

    await act(async ()=>{ jest.advanceTimersByTime(119000) })
    expect(screen.queryByText(/Tente de novo em 2 minutos/)).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', {name: 'Entrar na plataforma'}))
    expect(loginsFeitos().length).toBe(1)

    await act(async ()=>{ jest.advanceTimersByTime(1500) })
    expect(screen.queryByText(/Tente de novo em/)).toBeNull()
    await fireEvent.press(screen.getByRole('button', {name: 'Entrar na plataforma'}))
    await waitFor(()=> expect(loginsFeitos().length).toBe(2))
  })

  it('arredonda os minutos para cima', async ()=>{
    trocarFetch((url)=> url.endsWith('/auth/login') ? json(429, {code: 'LOGIN_LOCKED'}, {'Retry-After': '61'}) : null)
    await abrir()
    await tentar(CONTA_TESTE.identifier, 'x')
    expect(await screen.findByText(/Tente de novo em 2 minutos/)).toBeTruthy()
  })

  it('sem header usa o retryAfter do corpo', async ()=>{
    trocarFetch((url)=> url.endsWith('/auth/login') ? json(429, {code: 'LOGIN_LOCKED', retryAfter: 300}) : null)
    await abrir()
    await tentar(CONTA_TESTE.identifier, 'x')
    expect(await screen.findByText(/Tente de novo em 5 minutos/)).toBeTruthy()
  })

  it('sem header e sem corpo assume 15 minutos', async ()=>{
    trocarFetch((url)=> url.endsWith('/auth/login') ? json(429, {code: 'LOGIN_LOCKED'}) : null)
    await abrir()
    await tentar(CONTA_TESTE.identifier, 'x')
    expect(await screen.findByText(/Tente de novo em 15 minutos/)).toBeTruthy()
  })

  it('bloqueia na quinta falha usando o mock completo', async ()=>{
    await abrir()
    for(let i = 0; i < 3; i++){
      await tentar(CONTA_TESTE.identifier, 'errada')
      await screen.findByText('E-mail, CPF ou senha incorretos.')
    }
    await tentar(CONTA_TESTE.identifier, 'errada')
    await screen.findByText(/confirmar que você é humano/)
  })
})

describe('segundo fator', ()=>{
  async function ate2fa(){
    await abrir()
    await tentar(CONTA_2FA.identifier, CONTA_2FA.password)
    await screen.findByText('Verificação em duas etapas')
  }

  it('codigo errado mostra o detail do servidor', async ()=>{
    await ate2fa()
    await fireEvent.changeText(screen.getByLabelText('Código de verificação'), '000000')
    await fireEvent.press(screen.getByRole('button', {name: 'Confirmar código'}))
    expect(await screen.findByText('Código inválido.')).toBeTruthy()
    expect(mockReplace).not.toHaveBeenCalled()
    expect(await lerAccess()).toBeNull()
  })

  it('erro sem detail cai em codigo invalido', async ()=>{
    trocarFetch((url)=> url.endsWith('/auth/login/2fa') ? json(422, {code: 'CODE_INVALID'}) : null)
    await ate2fa()
    await fireEvent.changeText(screen.getByLabelText('Código de verificação'), '000000')
    await fireEvent.press(screen.getByRole('button', {name: 'Confirmar código'}))
    expect(await screen.findByText('Código inválido.')).toBeTruthy()
  })

  it('mostra o detail customizado do servidor', async ()=>{
    trocarFetch((url)=> url.endsWith('/auth/login/2fa') ? json(422, {code: 'CODE_INVALID', detail: 'Código expirado, peça outro.'}) : null)
    await ate2fa()
    await fireEvent.changeText(screen.getByLabelText('Código de verificação'), '000000')
    await fireEvent.press(screen.getByRole('button', {name: 'Confirmar código'}))
    expect(await screen.findByText('Código expirado, peça outro.')).toBeTruthy()
  })

  it('o campo do codigo so aceita 6 numeros', async ()=>{
    await ate2fa()
    await fireEvent.changeText(screen.getByLabelText('Código de verificação'), '12ab34-56789')
    expect(screen.getByLabelText('Código de verificação').props.value).toBe('123456')
  })

  it('codigo com menos de 6 digitos nao chama a api', async ()=>{
    await ate2fa()
    await fireEvent.changeText(screen.getByLabelText('Código de verificação'), '12345')
    await fireEvent.press(screen.getByRole('button', {name: 'Confirmar código'}))
    expect(screen.getByText('O código tem 6 números.')).toBeTruthy()
    expect(chamadas.filter(c => c.url.endsWith('/auth/login/2fa')).length).toBe(0)
  })

  it('manda o challengeId recebido no login', async ()=>{
    await ate2fa()
    await fireEvent.changeText(screen.getByLabelText('Código de verificação'), CONTA_2FA.code)
    await fireEvent.press(screen.getByRole('button', {name: 'Confirmar código'}))
    await waitFor(()=> expect(mockReplace).toHaveBeenCalledWith('/perfil'))
    const c = chamadas.find(x => x.url.endsWith('/auth/login/2fa'))
    expect(JSON.parse(c.opcoes.body)).toEqual({challengeId: 'c1', code: CONTA_2FA.code})
  })

  it('voltar limpa o codigo e o erro e volta para o login', async ()=>{
    await ate2fa()
    await fireEvent.changeText(screen.getByLabelText('Código de verificação'), '000000')
    await fireEvent.press(screen.getByRole('button', {name: 'Confirmar código'}))
    await screen.findByText('Código inválido.')
    await fireEvent.press(screen.getByRole('button', {name: 'Voltar'}))
    await screen.findByText('Acesse sua conta')
    expect(screen.queryByText('Código inválido.')).toBeNull()
    await tentar(CONTA_2FA.identifier, CONTA_2FA.password)
    await screen.findByText('Verificação em duas etapas')
    expect(screen.getByLabelText('Código de verificação').props.value).toBe('')
    expect(screen.queryByText('Código inválido.')).toBeNull()
  })

  it('sem conexao no 2fa mostra a mensagem', async ()=>{
    trocarFetch((url)=>{
      if(url.endsWith('/auth/login/2fa')) throw new Error('sem rede')
      return null
    })
    await ate2fa()
    await fireEvent.changeText(screen.getByLabelText('Código de verificação'), CONTA_2FA.code)
    await fireEvent.press(screen.getByRole('button', {name: 'Confirmar código'}))
    expect(await screen.findByText('Sem conexão. Confira a internet.')).toBeTruthy()
  })
})

describe('chave ed25519', ()=>{
  it('chave de tamanho errado nao impede o login mas nao e guardada', async ()=>{
    trocarFetch(async (url, opcoes, original)=>{
      if(!url.endsWith('/auth/login')) return null
      const r = await original(url, opcoes)
      const dados = await r.json()
      return json(200, {...dados, qrPublicKey: 'curta'})
    })
    await abrir()
    await tentar(CONTA_TESTE.identifier, CONTA_TESTE.password)
    await waitFor(()=> expect(mockReplace).toHaveBeenCalledWith('/perfil'))
    expect(await lerAccess()).toMatch(/^access-mock/)
    expect(await lerRefresh()).toMatch(/^refresh-mock/)
    expect(await lerChavePublica()).toBeNull()
  })

  it('login sem qrPublicKey tambem entra', async ()=>{
    trocarFetch(async (url, opcoes, original)=>{
      if(!url.endsWith('/auth/login')) return null
      const r = await original(url, opcoes)
      const dados = await r.json()
      delete dados.qrPublicKey
      return json(200, dados)
    })
    await abrir()
    await tentar(CONTA_TESTE.identifier, CONTA_TESTE.password)
    await waitFor(()=> expect(mockReplace).toHaveBeenCalledWith('/perfil'))
    expect(await lerChavePublica()).toBeNull()
  })
})

describe('renovacao de token', ()=>{
  it('refresh com 500 mantem os tokens e devolve a 401 original', async ()=>{
    await salvarTokens('access-velho', 'refresh-mock-1')
    trocarFetch((url)=> url.endsWith('/auth/refresh') ? json(500, {code: 'INTERNAL'}) : null)
    const aoExpirar = jest.fn()
    quandoExpirar(aoExpirar)
    const res = await chamar('/me/profile')
    expect(res.status).toBe(401)
    expect(await lerAccess()).toBe('access-velho')
    expect(await lerRefresh()).toBe('refresh-mock-1')
    expect(aoExpirar).not.toHaveBeenCalled()
    expect(mockRouterReplace).not.toHaveBeenCalled()
  })

  it('refresh com 503 tambem mantem os tokens', async ()=>{
    await salvarTokens('access-velho', 'refresh-mock-1')
    trocarFetch((url)=> url.endsWith('/auth/refresh') ? json(503, {}) : null)
    expect(await renovarToken()).toBe('erro')
    expect(await lerRefresh()).toBe('refresh-mock-1')
  })

  it('refresh 401 chama o handler registrado e vai para o login', async ()=>{
    await salvarTokens('access-velho', 'refresh-velho')
    const aoExpirar = jest.fn(async ()=>{})
    quandoExpirar(aoExpirar)
    const res = await chamar('/me/profile')
    expect(res.status).toBe(401)
    expect(aoExpirar).toHaveBeenCalledTimes(1)
    expect(mockRouterReplace).toHaveBeenCalledWith('/login')
  })

  it('refresh 400 e 403 tambem contam como sessao invalida', async ()=>{
    for(const status of [400, 403]){
      await salvarTokens('access-velho', 'refresh-mock-1')
      trocarFetch((url)=> url.endsWith('/auth/refresh') ? json(status, {}) : null)
      expect(await renovarToken()).toBe('invalido')
    }
  })

  it('sem refresh guardado o resultado e invalido sem chamar a api', async ()=>{
    await salvarTokens('access-velho')
    expect(await renovarToken()).toBe('invalido')
    expect(chamadas.filter(c => c.url.endsWith('/auth/refresh')).length).toBe(0)
  })

  it('refresh 401 dentro do provider zera o usuario e apaga os tokens', async ()=>{
    await salvarTokens('access-mock-1', 'refresh-mock-1')
    let usar: any = null
    function Pega(){
      const s = useSessao()
      usar = s
      return <Text>{s.carregando ? 'carregando' : s.usuario ? 'logado' : 'fora'}</Text>
    }
    await render(<SessaoProvider><Pega/></SessaoProvider>)
    await screen.findByText('logado')
    await salvarTokens('access-velho', 'refresh-velho')
    const res = await chamar('/me/profile')
    expect(res.status).toBe(401)
    await waitFor(()=> expect(screen.getByText('fora')).toBeTruthy())
    expect(usar.usuario).toBeNull()
    expect(await lerAccess()).toBeNull()
    expect(await lerRefresh()).toBeNull()
    expect(mockRouterReplace).toHaveBeenCalledWith('/login')
  })

  it('refresh 500 dentro do provider nao desloga o usuario', async ()=>{
    await salvarTokens('access-mock-1', 'refresh-mock-1')
    await render(<SessaoProvider><MostraSessao/></SessaoProvider>)
    await screen.findByText('logado u1')
    await salvarTokens('access-velho', 'refresh-mock-1')
    trocarFetch((url)=> url.endsWith('/auth/refresh') ? json(500, {}) : null)
    await chamar('/me/profile')
    expect(screen.getByText('logado u1')).toBeTruthy()
    expect(await lerAccess()).toBe('access-velho')
  })

  it('sem handler registrado sessaoExpirou limpa o aparelho sozinho', async ()=>{
    await salvarTokens('access-velho', 'refresh-velho')
    await sessaoExpirou()
    expect(await lerAccess()).toBeNull()
    expect(mockRouterReplace).toHaveBeenCalledWith('/login')
  })

  it('o refresh novo e usado na repeticao da chamada', async ()=>{
    await salvarTokens('access-velho', 'refresh-mock-1')
    await chamar('/me/profile')
    const perfis = chamadas.filter(c => c.url.endsWith('/me/profile'))
    expect(perfis.length).toBe(2)
    expect(perfis[0].opcoes.headers.Authorization).toBe('Bearer access-velho')
    expect(perfis[1].opcoes.headers.Authorization).toMatch(/^Bearer access-mock/)
  })

  it('depois de um refresh terminar, uma nova 401 faz outro refresh', async ()=>{
    await salvarTokens('access-velho', 'refresh-mock-1')
    await chamar('/me/profile')
    await salvarTokens('access-velho', 'refresh-mock-1')
    await chamar('/me/profile')
    expect(chamadas.filter(c => c.url.endsWith('/auth/refresh')).length).toBe(2)
  })

  it('tres 401 juntas fazem um refresh so mesmo com refresh lento', async ()=>{
    await salvarTokens('access-velho', 'refresh-mock-1')
    trocarFetch(async (url, opcoes, original)=>{
      if(url.endsWith('/auth/refresh')){
        await new Promise(r => setTimeout(r, 100))
        return original(url, opcoes)
      }
      return null
    })
    const rs = await Promise.all([chamar('/me/profile'), chamar('/me/security'), chamar('/me/profile')])
    expect(rs.map(r => r.status)).toEqual([200, 200, 200])
    expect(chamadas.filter(c => c.url.endsWith('/auth/refresh')).length).toBe(1)
  })

  it('token valido nao dispara refresh', async ()=>{
    await salvarTokens('access-mock-1', 'refresh-mock-1')
    const res = await chamar('/me/profile')
    expect(res.status).toBe(200)
    expect(chamadas.filter(c => c.url.endsWith('/auth/refresh')).length).toBe(0)
  })

  it('erros que nao sao 401 nao disparam refresh', async ()=>{
    await salvarTokens('access-mock-1', 'refresh-mock-1')
    const res = await chamar('/me/nao-existe')
    expect(res.status).toBe(501)
    expect(chamadas.filter(c => c.url.endsWith('/auth/refresh')).length).toBe(0)
  })
})

describe('chamar e cabecalhos', ()=>{
  it('chamar junta os headers personalizados com os padrao', async ()=>{
    await salvarTokens('access-mock-1', 'refresh-mock-1')
    await chamar('/me/profile', {headers: {'X-Teste': 'abc'}})
    const h = chamadas[0].opcoes.headers
    expect(h['X-Teste']).toBe('abc')
    expect(h.Authorization).toBe('Bearer access-mock-1')
    expect(h['Content-Type']).toBe('application/json')
    expect(h['X-Correlation-Id']).toBeTruthy()
  })

  it('header personalizado sobrescreve o padrao', async ()=>{
    await salvarTokens('access-mock-1', 'refresh-mock-1')
    await chamar('/me/profile', {headers: {'Content-Type': 'text/plain'}})
    expect(chamadas[0].opcoes.headers['Content-Type']).toBe('text/plain')
  })

  it('chamar repassa metodo e body', async ()=>{
    await salvarTokens('access-mock-1', 'refresh-mock-1')
    await chamar('/me/profile', {method: 'PATCH', body: '{"a":1}'})
    expect(chamadas[0].opcoes.method).toBe('PATCH')
    expect(chamadas[0].opcoes.body).toBe('{"a":1}')
  })

  it('chamar com json falso nao manda content-type', async ()=>{
    await salvarTokens('access-mock-1', 'refresh-mock-1')
    await chamar('/me/profile', {}, false)
    expect(chamadas[0].opcoes.headers['Content-Type']).toBeUndefined()
  })

  it('cabecalhos sem token nao tem authorization', async ()=>{
    const h = await cabecalhos()
    expect(h.Authorization).toBeUndefined()
    expect(h['Content-Type']).toBe('application/json')
    expect(h['X-Correlation-Id']).toBeTruthy()
  })

  it('cabecalhos com token manda bearer', async ()=>{
    await salvarTokens('access-mock-9', 'refresh-mock-9')
    const h = await cabecalhos(false)
    expect(h.Authorization).toBe('Bearer access-mock-9')
    expect(h['Content-Type']).toBeUndefined()
  })

  it('o correlation id muda entre chamadas', async ()=>{
    const a = await cabecalhos()
    const b = await cabecalhos()
    expect(a['X-Correlation-Id']).not.toBe(b['X-Correlation-Id'])
  })
})

describe('abertura da sessao', ()=>{
  it('so com refresh token renova, abre e guarda o access novo', async ()=>{
    await salvarTokens('', 'refresh-mock-1')
    await render(<SessaoProvider><MostraSessao/></SessaoProvider>)
    expect(await screen.findByText('logado u1')).toBeTruthy()
    expect(await lerAccess()).toMatch(/^access-mock/)
  })

  it('so com refresh invalido limpa tudo e fica deslogado', async ()=>{
    await salvarTokens('', 'refresh-velho')
    await render(<SessaoProvider><MostraSessao/></SessaoProvider>)
    expect(await screen.findByText('deslogado')).toBeTruthy()
    expect(await lerRefresh()).toBeNull()
  })

  it('so com refresh e refresh dando 500 fica deslogado mas mantem o refresh', async ()=>{
    await salvarTokens('', 'refresh-mock-1')
    trocarFetch((url)=> url.endsWith('/auth/refresh') ? json(500, {}) : null)
    await render(<SessaoProvider><MostraSessao/></SessaoProvider>)
    expect(await screen.findByText('deslogado')).toBeTruthy()
    expect(await lerRefresh()).toBe('refresh-mock-1')
  })

  it('offline na abertura nao apaga os tokens', async ()=>{
    await salvarTokens('access-mock-1', 'refresh-mock-1')
    trocarFetch(()=>{ throw new Error('sem rede') })
    await render(<SessaoProvider><MostraSessao/></SessaoProvider>)
    await waitFor(()=> expect(screen.queryByText('carregando')).toBeNull())
    expect(await lerAccess()).toBe('access-mock-1')
    expect(await lerRefresh()).toBe('refresh-mock-1')
    expect(mockRouterReplace).not.toHaveBeenCalled()
  })

  it('so com refresh e offline mantem o refresh', async ()=>{
    await salvarTokens('', 'refresh-mock-1')
    trocarFetch(()=>{ throw new Error('sem rede') })
    await render(<SessaoProvider><MostraSessao/></SessaoProvider>)
    expect(await screen.findByText('deslogado')).toBeTruthy()
    expect(await lerRefresh()).toBe('refresh-mock-1')
  })

  it('access expirado com refresh bom abre a sessao pela renovacao', async ()=>{
    await salvarTokens('access-velho', 'refresh-mock-1')
    await render(<SessaoProvider><MostraSessao/></SessaoProvider>)
    expect(await screen.findByText('logado u1')).toBeTruthy()
  })

  it('access expirado com refresh invalido deixa deslogado e limpo', async ()=>{
    await salvarTokens('access-velho', 'refresh-velho')
    await render(<SessaoProvider><MostraSessao/></SessaoProvider>)
    expect(await screen.findByText('deslogado')).toBeTruthy()
    expect(await lerAccess()).toBeNull()
  })

  it('a abertura nao chama /me quando nao ha nenhum token', async ()=>{
    await render(<SessaoProvider><MostraSessao/></SessaoProvider>)
    await screen.findByText('deslogado')
    expect(chamadas.length).toBe(0)
  })
})

describe('entrar e sair', ()=>{
  function capturar(){
    const ref: any = {}
    function Pega(){
      const s = useSessao()
      ref.s = s
      return <Text>{s.carregando ? 'carregando' : s.usuario ? 'logado' : 'fora'}</Text>
    }
    return {ref, Pega}
  }

  it('entrar guarda tokens e define o usuario', async ()=>{
    const {ref, Pega} = capturar()
    await render(<SessaoProvider><Pega/></SessaoProvider>)
    await screen.findByText('fora')
    await act(async ()=>{ await ref.s.entrar({accessToken: 'a1', refreshToken: 'r1', user: {id: 'x'}}) })
    expect(await screen.findByText('logado')).toBeTruthy()
    expect(await lerAccess()).toBe('a1')
    expect(await lerRefresh()).toBe('r1')
  })

  it('sair apaga tudo mesmo se o logout der erro', async ()=>{
    await salvarTokens('access-mock-1', 'refresh-mock-1')
    const {ref, Pega} = capturar()
    await render(<SessaoProvider><Pega/></SessaoProvider>)
    await screen.findByText('logado')
    trocarFetch((url)=>{
      if(url.endsWith('/auth/logout')) throw new Error('sem rede')
      return null
    })
    await act(async ()=>{ await ref.s.sair() })
    expect(await screen.findByText('fora')).toBeTruthy()
    expect(await lerAccess()).toBeNull()
    expect(await lerRefresh()).toBeNull()
  })

  it('sair nao espera o logout quando ele trava', async ()=>{
    await salvarTokens('access-mock-1', 'refresh-mock-1')
    const {ref, Pega} = capturar()
    await render(<SessaoProvider><Pega/></SessaoProvider>)
    await screen.findByText('logado')
    trocarFetch((url)=> url.endsWith('/auth/logout') ? new Promise(()=>{}) : null)
    let terminou = false
    await act(async ()=>{ await ref.s.sair(); terminou = true })
    expect(terminou).toBe(true)
    expect(await screen.findByText('fora')).toBeTruthy()
    expect(await lerAccess()).toBeNull()
  })

  it('sair avisa o servidor com o refresh e o bearer de antes da limpeza', async ()=>{
    await salvarTokens('access-mock-1', 'refresh-mock-1')
    const {ref, Pega} = capturar()
    await render(<SessaoProvider><Pega/></SessaoProvider>)
    await screen.findByText('logado')
    await act(async ()=>{ await ref.s.sair() })
    const c = chamadas.find(x => x.url == URL_API + '/auth/logout')
    expect(c).toBeTruthy()
    expect(c.opcoes.method).toBe('POST')
    expect(c.opcoes.headers.Authorization).toBe('Bearer access-mock-1')
    expect(JSON.parse(c.opcoes.body)).toEqual({refreshToken: 'refresh-mock-1'})
  })

  it('sair sem token nenhum nao quebra e nao manda bearer', async ()=>{
    const {ref, Pega} = capturar()
    await render(<SessaoProvider><Pega/></SessaoProvider>)
    await screen.findByText('fora')
    await act(async ()=>{ await ref.s.sair() })
    const c = chamadas.find(x => x.url.endsWith('/auth/logout'))
    expect(c.opcoes.headers.Authorization).toBeUndefined()
    expect(screen.getByText('fora')).toBeTruthy()
  })
})
