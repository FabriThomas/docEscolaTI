import * as SecureStore from 'expo-secure-store'

export const CHAVE_ACCESS = 'STEELY_JWT_ACCESS'
export const CHAVE_REFRESH = 'STEELY_JWT_REFRESH'
export const CHAVE_ED25519 = 'STEELY_ED25519_PUB'

const opcoes = {keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY}

export async function salvarTokens(access: string, refresh?: string | null){
  try{
    await SecureStore.setItemAsync(CHAVE_ACCESS, access, opcoes)
    if(refresh) await SecureStore.setItemAsync(CHAVE_REFRESH, refresh, opcoes)
  }catch(e){
    throw new Error('erro ao salvar o login no aparelho')
  }
}

export async function lerAccess(){
  try{
    return await SecureStore.getItemAsync(CHAVE_ACCESS, opcoes)
  }catch(e){
    return null
  }
}

export async function lerRefresh(){
  try{
    return await SecureStore.getItemAsync(CHAVE_REFRESH, opcoes)
  }catch(e){
    return null
  }
}

export async function salvarChavePublica(chave: string){
  if(chave.length != 44) throw new Error('chave publica invalida')
  await SecureStore.setItemAsync(CHAVE_ED25519, chave, opcoes)
}

export async function lerChavePublica(){
  try{
    return await SecureStore.getItemAsync(CHAVE_ED25519, opcoes)
  }catch(e){
    return null
  }
}

export async function apagarChaves(){
  for(const chave of [CHAVE_ACCESS, CHAVE_REFRESH, CHAVE_ED25519]){
    try{
      await SecureStore.deleteItemAsync(chave, opcoes)
    }catch(e){
      await SecureStore.deleteItemAsync(chave, opcoes).catch(()=>{})
    }
  }
}
