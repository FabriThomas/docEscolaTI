import { render, screen, fireEvent, waitFor } from '@testing-library/react-native'
import Seguranca from '../app/perfil/seguranca'
import { SessaoProvider } from '../src/SessaoContext'
import { resetarMock } from '../src/mock'
import { salvarTokens, lerAccess } from '../src/secureStorage'

const mockPush = jest.fn()
const mockReplace = jest.fn()
jest.mock('expo-router', ()=>{
  const React = require('react')
  return {
    useRouter: ()=> ({push: mockPush, replace: mockReplace, back: jest.fn()}),
    router: {replace: jest.fn()},
    useFocusEffect: (cb: any)=> React.useEffect(()=>{ cb() }, []),
  }
})

beforeEach(async ()=>{
  resetarMock()
  jest.clearAllMocks()
  await salvarTokens('access-mock-1', 'refresh-mock-1')
})

async function abrir(){
  await render(<SessaoProvider><Seguranca/></SessaoProvider>)
  await screen.findByText('Sua conta está protegida')
}

it('mostra o banner, o acesso e as sessoes', async ()=>{
  await abrir()
  expect(screen.getByText('2FA ativo · senha trocada há 2 meses')).toBeTruthy()
  expect(screen.getByText('Mínimo de 10 caracteres')).toBeTruthy()
  expect(screen.getByText('2 aparelhos')).toBeTruthy()
  expect(screen.getByText('Atual')).toBeTruthy()
  expect(screen.getByText('Toda mudança de senha, 2FA ou sessão é registrada e avisada por e-mail.')).toBeTruthy()
})

it('leva pras telas de senha, 2fa e exclusao', async ()=>{
  await abrir()
  await fireEvent.press(screen.getByRole('button', {name: 'Alterar senha'}))
  await fireEvent.press(screen.getByRole('button', {name: 'Verificação em duas etapas, ligada'}))
  await fireEvent.press(screen.getByRole('button', {name: 'Solicitar exclusão da conta'}))
  expect(mockPush).toHaveBeenCalledWith('/perfil/senha')
  expect(mockPush).toHaveBeenCalledWith('/perfil/doisfatores')
  expect(mockPush).toHaveBeenCalledWith('/perfil/excluir')
})

it('gera codigos de recuperacao e mostra uma vez', async ()=>{
  await abrir()
  await fireEvent.press(screen.getByRole('button', {name: 'Códigos de recuperação'}))
  await fireEvent.press(screen.getByRole('button', {name: 'Gerar códigos'}))
  expect(await screen.findByText('Seus códigos de recuperação')).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', {name: 'Já guardei'}))
  expect(screen.queryByText('Seus códigos de recuperação')).toBeNull()
})

it('encerra outra sessao', async ()=>{
  await abrir()
  await fireEvent.press(screen.getByRole('button', {name: 'Encerrar Chrome no Windows'}))
  await fireEvent.press(screen.getByRole('button', {name: 'Encerrar'}))
  await waitFor(()=> expect(screen.getByText('1 aparelho')).toBeTruthy())
  expect(screen.queryByText('Chrome no Windows')).toBeNull()
})

it('sair de todos limpa o aparelho e vai pro login', async ()=>{
  await abrir()
  await fireEvent.press(screen.getByRole('button', {name: 'Sair de todos os aparelhos'}))
  await fireEvent.press(screen.getByRole('button', {name: 'Sair de todos'}))
  await waitFor(()=> expect(mockReplace).toHaveBeenCalledWith('/login'))
  expect(await lerAccess()).toBeNull()
})

it('mostra erro quando nao carrega', async ()=>{
  const original = globalThis.fetch
  globalThis.fetch = jest.fn(async ()=>{ throw new Error('sem rede') }) as any
  await render(<SessaoProvider><Seguranca/></SessaoProvider>)
  expect(await screen.findByText('Sem conexão. Confira a internet.')).toBeTruthy()
  globalThis.fetch = original
})
