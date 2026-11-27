import { render, screen, fireEvent, waitFor } from '@testing-library/react-native'
import Perfil from '../app/(abas)/perfil'
import { SessaoProvider } from '../src/SessaoContext'
import { resetarMock, mudarConta } from '../src/mock'
import { salvarTokens, lerAccess } from '../src/secureStorage'

const mockPush = jest.fn()
const mockReplace = jest.fn()
jest.mock('expo-router', ()=>{
  const React = require('react')
  return {
    useRouter: ()=> ({push: mockPush, replace: mockReplace, back: jest.fn()}),
    useFocusEffect: (cb: any)=> React.useEffect(()=>{ cb() }, []),
    router: {push: jest.fn(), replace: jest.fn(), back: jest.fn()},
  }
})

beforeEach(async ()=>{
  resetarMock()
  jest.clearAllMocks()
  await salvarTokens('access-mock-1', 'refresh-mock-1')
})

async function abrir(){
  await render(<SessaoProvider><Perfil/></SessaoProvider>)
  await screen.findByText('Usuário Teste')
}

it('mostra os dados do perfil', async ()=>{
  await abrir()
  expect(screen.getByText('Zona 7, Maringá – PR · desde mar/2026')).toBeTruthy()
  expect(screen.getByText('E-mail verificado · 2FA ativo')).toBeTruthy()
  expect(screen.getAllByText('4,8').length).toBeGreaterThan(0)
  expect(screen.getByText('23 avaliações · 31 negociações')).toBeTruthy()
  expect(screen.getByText('Fidelidade do anúncio')).toBeTruthy()
  expect(screen.getByText('Reciclador')).toBeTruthy()
  expect(screen.getByText('Doador')).toBeTruthy()
  expect(screen.getByText('7,4 kg evitados')).toBeTruthy()
  expect(screen.getByText('3 ativos · 1 pausado')).toBeTruthy()
  expect(screen.getByText('340 moedas disponíveis')).toBeTruthy()
})

it('sem 2fa mostra so e-mail verificado', async ()=>{
  mudarConta({twoFactorEnabled: false})
  await abrir()
  expect(screen.getByText('E-mail verificado')).toBeTruthy()
})

it('botoes levam pras telas certas', async ()=>{
  await abrir()
  await fireEvent.press(screen.getByRole('button', {name: 'Editar perfil'}))
  expect(mockPush).toHaveBeenCalledWith('/perfil/editar')
  await fireEvent.press(screen.getByRole('button', {name: 'Segurança da conta'}))
  expect(mockPush).toHaveBeenCalledWith('/perfil/seguranca')
  await fireEvent.press(screen.getByRole('button', {name: 'Meus anúncios'}))
  expect(mockPush).toHaveBeenCalledWith('/anuncios')
})

it('sair pede confirmacao e cancelar nao sai (STY009)', async ()=>{
  await abrir()
  await fireEvent.press(screen.getByRole('button', {name: 'Sair da conta'}))
  expect(screen.getByText('Sair da conta?')).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', {name: 'Cancelar'}))
  expect(mockReplace).not.toHaveBeenCalled()
  expect(await lerAccess()).toBe('access-mock-1')
})

it('confirmar sair apaga o token e vai pro login', async ()=>{
  await abrir()
  await fireEvent.press(screen.getByRole('button', {name: 'Sair da conta'}))
  await fireEvent.press(screen.getByRole('button', {name: 'Sair'}))
  await waitFor(()=> expect(mockReplace).toHaveBeenCalledWith('/login'))
  await waitFor(()=> expect(screen.queryByText('Sair da conta?')).toBeNull())
  expect(await lerAccess()).toBeNull()
})

it('sem internet mostra erro e tentar de novo', async ()=>{
  const original = globalThis.fetch
  globalThis.fetch = jest.fn(async ()=>{ throw new Error('offline') }) as any
  await render(<SessaoProvider><Perfil/></SessaoProvider>)
  expect(await screen.findByText('Sem conexão. Confira a internet.')).toBeTruthy()
  globalThis.fetch = original
  await fireEvent.press(screen.getByRole('button', {name: 'Tentar de novo'}))
  expect(await screen.findByText('Usuário Teste')).toBeTruthy()
})
