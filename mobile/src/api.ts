import { router } from 'expo-router'
import { lerAccess, lerRefresh, salvarTokens } from './secureStorage'
import { limparAparelho } from './limpeza'
import { URL_API } from './config'

export { URL_API, USAR_MOCK } from './config'

export async function cabecalhos(json = true){
  const token = await lerAccess()
  const h: any = {'X-Correlation-Id': Date.now().toString(36) + Math.random().toString(36).slice(2, 8)}
  if(json) h['Content-Type'] = 'application/json'
  if(token) h.Authorization = 'Bearer ' + token
  return h
}

export async function lerResposta(res: Response){
  const dados = await res.json().catch(()=> ({}))
  return dados || {}
}

let renovando: any = null
let aoExpirar: any = null

export function quandoExpirar(funcao: any){
  aoExpirar = funcao
}

async function pedirRefresh(){
  const refresh = await lerRefresh()
  if(!refresh) return 'invalido'
  try{
    const res = await fetch(URL_API + '/auth/refresh', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({refreshToken: refresh})
    })
    if(res.status == 400 || res.status == 401 || res.status == 403) return 'invalido'
    if(!res.ok) return 'erro'
    const dados = await lerResposta(res)
    await salvarTokens(dados.accessToken, dados.refreshToken)
    return 'ok'
  }catch(e){
    return 'erro'
  }
}

export function renovarToken(){
  if(!renovando){
    renovando = pedirRefresh().finally(()=>{ renovando = null })
  }
  return renovando
}

export async function sessaoExpirou(){
  if(aoExpirar) await aoExpirar()
  else await limparAparelho()
  router.replace('/login')
}

export async function chamar(caminho: string, opcoes: any = {}, json = true){
  let res = await fetch(URL_API + caminho, {...opcoes, headers: {...await cabecalhos(json), ...opcoes.headers}})
  if(res.status == 401){
    const resultado = await renovarToken()
    if(resultado == 'invalido'){
      await sessaoExpirou()
      return res
    }
    if(resultado == 'erro') return res
    res = await fetch(URL_API + caminho, {...opcoes, headers: {...await cabecalhos(json), ...opcoes.headers}})
  }
  return res
}
