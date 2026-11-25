import * as SecureStore from 'expo-secure-store'

export const URL_API = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000/api/v1'
export const USAR_MOCK = process.env.EXPO_PUBLIC_USAR_MOCK == 'sim'

export async function cabecalhos(json = true){
  const token = await SecureStore.getItemAsync('STEELY_JWT_ACCESS')
  const h: any = {'X-Correlation-Id': Date.now().toString(36) + Math.random().toString(36).slice(2, 8)}
  if(json) h['Content-Type'] = 'application/json'
  if(token) h.Authorization = 'Bearer ' + token
  return h
}

export async function lerResposta(res: Response){
  const dados = await res.json().catch(()=> ({}))
  return dados || {}
}
