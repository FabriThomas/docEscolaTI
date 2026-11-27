import { render, screen, fireEvent } from '@testing-library/react-native'
import AlterarSenha from '../app/perfil/senha'
import { resetarMock, CONTA_TESTE } from '../src/mock'
import { salvarTokens } from '../src/secureStorage'

jest.mock('expo-router', ()=> ({
  useRouter: ()=> ({push: jest.fn(), replace: jest.fn(), back: jest.fn()}),
  router: {replace: jest.fn()},
}))

beforeEach(async ()=>{
  resetarMock()
  await salvarTokens('access-mock-1', 'refresh-mock-1')
})

async function preencher(atual: string, nova: string, confirmar: string){
  await render(<AlterarSenha/>)
  await fireEvent.changeText(screen.getByLabelText('Senha atual'), atual)
  await fireEvent.changeText(screen.getByLabelText('Nova senha'), nova)
  await fireEvent.changeText(screen.getByLabelText('Confirmar nova senha'), confirmar)
  await fireEvent.press(screen.getByRole('button', {name: 'Salvar nova senha'}))
}

it('pede a senha atual', async ()=>{
  await preencher('', 'Nova@Senha2026', 'Nova@Senha2026')
  expect(screen.getByText('Informe sua senha atual.')).toBeTruthy()
})

it('avisa o que falta na nova senha', async ()=>{
  await preencher(CONTA_TESTE.password, 'curta', 'curta')
  expect(screen.getByText('A senha precisa de: 10 caracteres, uma letra maiúscula, um número, um caractere especial.')).toBeTruthy()
})

it('senhas diferentes nao conferem', async ()=>{
  await preencher(CONTA_TESTE.password, 'Nova@Senha2026', 'Nova@Senha2027')
  expect(screen.getByText('As senhas não conferem.')).toBeTruthy()
})

it('nova igual a atual', async ()=>{
  await preencher(CONTA_TESTE.password, CONTA_TESTE.password, CONTA_TESTE.password)
  expect(screen.getByText('A nova senha precisa ser diferente da atual.')).toBeTruthy()
})

it('senha atual errada mostra o erro da api', async ()=>{
  await preencher('Errada@20266', 'Nova@Senha2026', 'Nova@Senha2026')
  expect(await screen.findByText('Senha atual incorreta.')).toBeTruthy()
})

it('troca a senha', async ()=>{
  await preencher(CONTA_TESTE.password, 'Nova@Senha2026', 'Nova@Senha2026')
  expect(await screen.findByText('Senha alterada. Mandamos um aviso pro seu e-mail.')).toBeTruthy()
})
