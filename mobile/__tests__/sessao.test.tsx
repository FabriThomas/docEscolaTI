import { render, screen, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'
import { SessaoProvider, useSessao } from '../src/SessaoContext'
import { chamar } from '../src/api'
import { resetarMock } from '../src/mock'
import { salvarTokens, lerAccess, apagarChaves } from '../src/secureStorage'

const mockReplace = jest.fn()
jest.mock('expo-router', ()=> ({
  router: {replace: (r: any)=> mockReplace(r)},
}))

beforeEach(async ()=>{
  resetarMock()
  jest.clearAllMocks()
  await apagarChaves()
})

function Mostra(){
  const {usuario, carregando} = useSessao()
  if(carregando) return <Text>carregando</Text>
  return <Text>{usuario ? 'logado ' + usuario.id : 'deslogado'}</Text>
}

it('sem token fica deslogado', async ()=>{
  await render(<SessaoProvider><Mostra/></SessaoProvider>)
  expect(await screen.findByText('deslogado')).toBeTruthy()
})

it('com token abre a sessao', async ()=>{
  await salvarTokens('access-mock-1', 'refresh-mock-1')
  await render(<SessaoProvider><Mostra/></SessaoProvider>)
  expect(await screen.findByText('logado u1')).toBeTruthy()
})

it('so com refresh renova e abre', async ()=>{
  await salvarTokens('access-velho', 'refresh-mock-1')
  await apagarChaves()
  await salvarTokens('', 'refresh-mock-1')
  await render(<SessaoProvider><Mostra/></SessaoProvider>)
  expect(await screen.findByText('logado u1')).toBeTruthy()
  expect(await lerAccess()).toMatch(/^access-mock/)
})

it('chamar renova o token quando da 401', async ()=>{
  await salvarTokens('access-velho', 'refresh-mock-1')
  const res = await chamar('/me/profile')
  expect(res.status).toBe(200)
  expect(await lerAccess()).toMatch(/^access-mock/)
})

it('chamar limpa e manda pro login se o refresh falhar', async ()=>{
  await salvarTokens('access-velho', 'refresh-velho')
  const res = await chamar('/me/profile')
  expect(res.status).toBe(401)
  expect(await lerAccess()).toBeNull()
  expect(mockReplace).toHaveBeenCalledWith('/login')
})

it('refresh sem internet nao apaga nada', async ()=>{
  await salvarTokens('access-velho', 'refresh-mock-1')
  const original = globalThis.fetch
  globalThis.fetch = (async (url: any, opcoes: any)=>{
    if(String(url).includes('/auth/refresh')) throw new Error('sem rede')
    return original(url, opcoes)
  }) as any
  const res = await chamar('/me/profile')
  globalThis.fetch = original
  expect(res.status).toBe(401)
  expect(await lerAccess()).toBe('access-velho')
  expect(mockReplace).not.toHaveBeenCalled()
})

it('duas 401 juntas fazem um refresh so', async ()=>{
  await salvarTokens('access-velho', 'refresh-mock-1')
  const original = globalThis.fetch
  let refreshs = 0
  globalThis.fetch = (async (url: any, opcoes: any)=>{
    if(String(url).includes('/auth/refresh')) refreshs++
    return original(url, opcoes)
  }) as any
  const [a, b] = await Promise.all([chamar('/me/profile'), chamar('/me/security')])
  globalThis.fetch = original
  expect(a.status).toBe(200)
  expect(b.status).toBe(200)
  expect(refreshs).toBe(1)
})

it('sair apaga o aparelho na hora', async ()=>{
  await salvarTokens('access-mock-1', 'refresh-mock-1')
  let sairFn: any = null
  function Pega(){
    const s = useSessao()
    sairFn = s.sair
    return <Text>{s.usuario ? 'logado' : 'fora'}</Text>
  }
  await render(<SessaoProvider><Pega/></SessaoProvider>)
  await screen.findByText('logado')
  await sairFn()
  await waitFor(()=> expect(screen.getByText('fora')).toBeTruthy())
  expect(await lerAccess()).toBeNull()
})
