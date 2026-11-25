import { render, screen, fireEvent, waitFor } from '@testing-library/react-native'
import ExcluirConta from '../app/perfil/excluir'
import { SessaoProvider } from '../src/SessaoContext'
import { resetarMock, mudarConta, CONTA_TESTE } from '../src/mock'
import { salvarTokens, lerAccess } from '../src/secureStorage'

const mockReplace = jest.fn()
jest.mock('expo-router', ()=> ({
  useRouter: ()=> ({push: jest.fn(), replace: mockReplace, back: jest.fn()}),
  router: {replace: jest.fn()},
}))

beforeEach(async ()=>{
  resetarMock()
  jest.clearAllMocks()
  await salvarTokens('access-mock-1', 'refresh-mock-1')
})

async function preencher(senha: string, confirmacao: string){
  await render(<SessaoProvider><ExcluirConta/></SessaoProvider>)
  await fireEvent.changeText(screen.getByLabelText('Senha atual'), senha)
  await fireEvent.changeText(screen.getByLabelText('Confirmação'), confirmacao)
  await fireEvent.press(screen.getByRole('button', {name: 'Solicitar exclusão'}))
}

it('pede EXCLUIR em maiusculas', async ()=>{
  await preencher(CONTA_TESTE.password, 'excluir')
  expect(screen.getByText('Digite EXCLUIR em letras maiúsculas.')).toBeTruthy()
})

it('senha errada mostra o erro', async ()=>{
  await preencher('Errada@20266', 'EXCLUIR')
  expect(await screen.findByText('Senha atual incorreta.')).toBeTruthy()
})

it('com moedas pede confirmacao extra e depois exclui', async ()=>{
  await preencher(CONTA_TESTE.password, 'EXCLUIR')
  expect(await screen.findByText('Você ainda tem 340 moedas')).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', {name: 'Excluir mesmo assim'}))
  await waitFor(()=> expect(mockReplace).toHaveBeenCalledWith('/login'))
  expect(await lerAccess()).toBeNull()
})

it('sem moedas exclui direto', async ()=>{
  mudarConta({coins: 0})
  await preencher(CONTA_TESTE.password, 'EXCLUIR')
  await waitFor(()=> expect(mockReplace).toHaveBeenCalledWith('/login'))
})
