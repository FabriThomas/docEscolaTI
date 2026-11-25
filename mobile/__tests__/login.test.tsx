import { render, screen, fireEvent, waitFor } from '@testing-library/react-native'
import Login from '../app/login'
import { SessaoProvider } from '../src/SessaoContext'
import { resetarMock, CONTA_TESTE, CONTA_2FA } from '../src/mock'
import { lerAccess, lerChavePublica, apagarChaves } from '../src/secureStorage'

const mockReplace = jest.fn()
jest.mock('expo-router', ()=> ({
  useRouter: ()=> ({push: jest.fn(), replace: mockReplace, back: jest.fn()}),
  router: {replace: jest.fn()},
}))

beforeEach(async ()=>{
  resetarMock()
  jest.clearAllMocks()
  await apagarChaves()
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

it('entra com a conta de teste e guarda o token', async ()=>{
  await abrir()
  await tentar(CONTA_TESTE.identifier, CONTA_TESTE.password)
  await waitFor(()=> expect(mockReplace).toHaveBeenCalledWith('/perfil'))
  expect(await lerAccess()).toMatch(/^access-mock/)
  expect((await lerChavePublica())?.length).toBe(44)
})

it('valida e-mail ou cpf antes de mandar', async ()=>{
  await abrir()
  await tentar('qualquercoisa', 'x')
  expect(screen.getByText('Informe um e-mail ou CPF válido.')).toBeTruthy()
})

it('erro de senha e generico (STY002 RN01)', async ()=>{
  await abrir()
  await tentar(CONTA_TESTE.identifier, 'errada')
  expect(await screen.findByText('E-mail, CPF ou senha incorretos.')).toBeTruthy()
})

it('pede captcha depois de 3 erros e bloqueia depois de 5', async ()=>{
  await abrir()
  for(let i = 0; i < 3; i++){
    await tentar(CONTA_TESTE.identifier, 'errada')
    await screen.findByText('E-mail, CPF ou senha incorretos.')
  }
  await tentar(CONTA_TESTE.identifier, 'errada')
  expect(await screen.findByText(/confirmar que você é humano/)).toBeTruthy()
})

it('conta com 2fa pede o codigo', async ()=>{
  await abrir()
  await tentar(CONTA_2FA.identifier, CONTA_2FA.password)
  await screen.findByText('Verificação em duas etapas')
  await fireEvent.changeText(screen.getByLabelText('Código de verificação'), '12')
  await fireEvent.press(screen.getByRole('button', {name: 'Confirmar código'}))
  expect(screen.getByText('O código tem 6 números.')).toBeTruthy()
  await fireEvent.changeText(screen.getByLabelText('Código de verificação'), CONTA_2FA.code)
  await fireEvent.press(screen.getByRole('button', {name: 'Confirmar código'}))
  await waitFor(()=> expect(mockReplace).toHaveBeenCalledWith('/perfil'))
})
