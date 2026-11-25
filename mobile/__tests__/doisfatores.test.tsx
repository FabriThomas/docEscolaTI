import { render, screen, fireEvent } from '@testing-library/react-native'
import DoisFatores from '../app/perfil/doisfatores'
import { resetarMock, CONTA_TESTE, CONTA_2FA } from '../src/mock'
import { salvarTokens } from '../src/secureStorage'
import { chamar } from '../src/api'

jest.mock('expo-router', ()=>{
  const React = require('react')
  return {
    useRouter: ()=> ({push: jest.fn(), replace: jest.fn(), back: jest.fn()}),
    router: {replace: jest.fn()},
    useFocusEffect: (cb: any)=> React.useEffect(()=>{ cb() }, []),
  }
})

beforeEach(async ()=>{
  resetarMock()
  await salvarTokens('access-mock-1', 'refresh-mock-1')
})

async function desligarAntes(){
  await chamar('/me/2fa/disable', {method: 'POST', body: JSON.stringify({password: CONTA_TESTE.password, code: CONTA_2FA.code})})
}

it('ativa o 2fa e mostra os codigos', async ()=>{
  await desligarAntes()
  await render(<DoisFatores/>)
  await fireEvent.press(await screen.findByRole('button', {name: 'Configurar verificação'}))
  expect(await screen.findByText('JBSWY3DPEHPK3PXP')).toBeTruthy()
  await fireEvent.changeText(screen.getByLabelText('Código de 6 números'), '123')
  await fireEvent.press(screen.getByRole('button', {name: 'Ativar verificação'}))
  expect(screen.getByText('O código tem 6 números.')).toBeTruthy()
  await fireEvent.changeText(screen.getByLabelText('Código de 6 números'), '999999')
  await fireEvent.press(screen.getByRole('button', {name: 'Ativar verificação'}))
  expect(await screen.findByText('Código inválido.')).toBeTruthy()
  await fireEvent.changeText(screen.getByLabelText('Código de 6 números'), CONTA_2FA.code)
  await fireEvent.press(screen.getByRole('button', {name: 'Ativar verificação'}))
  expect(await screen.findByText('Verificação ativada')).toBeTruthy()
  expect(screen.getByRole('button', {name: 'Já guardei'})).toBeTruthy()
})

it('desligar pede senha e codigo', async ()=>{
  await render(<DoisFatores/>)
  await fireEvent.press(await screen.findByRole('button', {name: 'Desligar verificação'}))
  expect(screen.getByText('Informe sua senha atual.')).toBeTruthy()
  await fireEvent.changeText(screen.getByLabelText('Senha atual'), 'Errada@20266')
  await fireEvent.changeText(screen.getByLabelText('Código de 6 números'), CONTA_2FA.code)
  await fireEvent.press(screen.getByRole('button', {name: 'Desligar verificação'}))
  expect(await screen.findByText('Senha atual incorreta.')).toBeTruthy()
})

it('desliga o 2fa', async ()=>{
  await render(<DoisFatores/>)
  await fireEvent.changeText(await screen.findByLabelText('Senha atual'), CONTA_TESTE.password)
  await fireEvent.changeText(screen.getByLabelText('Código de 6 números'), CONTA_2FA.code)
  await fireEvent.press(screen.getByRole('button', {name: 'Desligar verificação'}))
  expect(await screen.findByText('Verificação desligada')).toBeTruthy()
})

it('sem conexao mostra tentar de novo e nao o configurar', async ()=>{
  const original = globalThis.fetch
  globalThis.fetch = jest.fn(async ()=>{ throw new Error('sem rede') }) as any
  await render(<DoisFatores/>)
  expect(await screen.findByText('Sem conexão. Confira a internet.')).toBeTruthy()
  expect(screen.queryByRole('button', {name: 'Configurar verificação'})).toBeNull()
  globalThis.fetch = original
  await fireEvent.press(screen.getByRole('button', {name: 'Tentar de novo'}))
  expect(await screen.findByRole('button', {name: 'Desligar verificação'}, {timeout: 3000})).toBeTruthy()
})
