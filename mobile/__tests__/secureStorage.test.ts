import { salvarTokens, lerAccess, lerRefresh, salvarChavePublica, lerChavePublica, apagarChaves } from '../src/secureStorage'

it('guarda e le os tokens', async ()=>{
  await salvarTokens('access-teste', 'refresh-teste')
  expect(await lerAccess()).toBe('access-teste')
  expect(await lerRefresh()).toBe('refresh-teste')
})

it('chave publica precisa ter 44 caracteres', async ()=>{
  await expect(salvarChavePublica('curta')).rejects.toThrow('chave publica invalida')
  await salvarChavePublica('A'.repeat(43) + '=')
  expect(await lerChavePublica()).toBe('A'.repeat(43) + '=')
})

it('apagar tira as tres chaves (ADR-24)', async ()=>{
  await salvarTokens('a', 'b')
  await salvarChavePublica('A'.repeat(43) + '=')
  await apagarChaves()
  expect(await lerAccess()).toBeNull()
  expect(await lerRefresh()).toBeNull()
  expect(await lerChavePublica()).toBeNull()
})
