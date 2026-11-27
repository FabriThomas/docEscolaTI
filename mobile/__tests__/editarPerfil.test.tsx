import { render, screen, fireEvent, waitFor } from '@testing-library/react-native'
import EditarPerfil, { validarPerfil } from '../app/perfil/editar'
import { resetarMock } from '../src/mock'
import { salvarTokens } from '../src/secureStorage'
import { URL_API } from '../src/api'

const mockBack = jest.fn()
jest.mock('expo-router', ()=> ({
  useRouter: ()=> ({push: jest.fn(), replace: jest.fn(), back: mockBack}),
  router: {push: jest.fn(), replace: jest.fn(), back: jest.fn()},
}))

jest.mock('expo-image-picker', ()=> ({
  requestMediaLibraryPermissionsAsync: jest.fn(async ()=> ({granted: true})),
  launchImageLibraryAsync: jest.fn(async ()=> ({canceled: false, assets: [{uri: 'file://grande.jpg', width: 4000, height: 4000, fileSize: 8 * 1024 * 1024}]})),
}))

beforeEach(async ()=>{
  resetarMock()
  jest.clearAllMocks()
  await salvarTokens('access-mock-1', 'refresh-mock-1')
})

async function abrir(){
  await render(<EditarPerfil/>)
  await screen.findByDisplayValue('Usuário Teste')
}

it('valida igual o schema da web', ()=>{
  expect(validarPerfil('A', '', 'Zona 7').nome).toBe('Use pelo menos 2 caracteres.')
  expect(validarPerfil('a'.repeat(41), '', 'Zona 7').nome).toBe('Use no máximo 40 caracteres.')
  expect(validarPerfil('joao@x.com', '', 'Zona 7').nome).toBe('Não use e-mail ou telefone no nome de exibição.')
  expect(validarPerfil('Joao 44999', '', 'Zona 7').nome).toBe('Não use e-mail ou telefone no nome de exibição.')
  expect(validarPerfil('Joao', 'x'.repeat(161), 'Zona 7').bio).toBe('Use no máximo 160 caracteres.')
  expect(validarPerfil('Joao', '', ' ').regiao).toBe('Escolha sua região.')
  expect(validarPerfil('Joao', '', 'Zona 7')).toEqual({})
})

it('carrega os dados e o e-mail mascarado', async ()=>{
  await abrir()
  expect(screen.getByDisplayValue('Monto PCs nas horas vagas.')).toBeTruthy()
  expect(screen.getByText('te•••@steely.dev')).toBeTruthy()
  expect(screen.getByText('Verificado')).toBeTruthy()
  expect(screen.getByText('26/160')).toBeTruthy()
})

it('mostra os erros e nao salva', async ()=>{
  await abrir()
  await fireEvent.changeText(screen.getByLabelText('Nome de exibição'), 'A')
  await fireEvent.changeText(screen.getByLabelText('Região'), '')
  await fireEvent.press(screen.getByRole('button', {name: 'Salvar alterações'}))
  expect(screen.getByText('Use pelo menos 2 caracteres.')).toBeTruthy()
  expect(screen.getByText('Escolha sua região.')).toBeTruthy()
  expect(mockBack).not.toHaveBeenCalled()
})

it('salva e volta', async ()=>{
  await abrir()
  await fireEvent.changeText(screen.getByLabelText('Nome de exibição'), 'Novo Nome')
  await fireEvent.press(screen.getByRole('button', {name: 'Salvar alterações'}))
  await waitFor(()=> expect(mockBack).toHaveBeenCalled())
  const res = await fetch(URL_API + '/me/profile', {headers: {Authorization: 'Bearer access-mock-1'}})
  const dados = await res.json()
  expect(dados.displayName).toBe('Novo Nome')
})

it('telefone no sobre voce mostra o erro do servidor', async ()=>{
  await abrir()
  await fireEvent.changeText(screen.getByLabelText('Sobre você'), 'me chama no 44 99999-1234')
  await fireEvent.press(screen.getByRole('button', {name: 'Salvar alterações'}))
  expect(await screen.findByText('Tire telefone, e-mail ou endereço do "Sobre você".')).toBeTruthy()
  expect(mockBack).not.toHaveBeenCalled()
})

it('foto maior que 5 MB e recusada', async ()=>{
  await abrir()
  await fireEvent.press(screen.getByRole('button', {name: 'Alterar foto'}))
  expect(await screen.findByText('A foto passa de 5 MB. Escolha outra.')).toBeTruthy()
})
