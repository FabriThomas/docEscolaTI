import NetInfo from '@react-native-community/netinfo'
import { listar, salvar, apagar, lerInfo, salvarInfo, tirarVencidos, VALIDADE } from './banco'
import { chamar, lerResposta } from './api'

let sincronizando = false

export async function enviarFila(){
  const fila: any[] = await listar('pending_mutations')
  for(const m of fila){
    try{
      const res = await chamar(m.caminho, {method: 'POST', headers: {'Idempotency-Key': m.idempotency_key}, body: m.corpo})
      if(res.status == 401) return
      const dados = await lerResposta(res)
      if(res.ok || dados.code == 'IDEMPOTENCY_KEY_REUSED'){
        await apagar('pending_mutations', m.id)
      }else if(dados.code != 'IDEMPOTENCY_IN_PROGRESS'){
        await salvar('pending_mutations', {...m, tentativas: m.tentativas + 1, updated_at: Date.now()})
      }
    }catch(e){
      return
    }
  }
}

export async function baixarMudancas(){
  const ultima = await lerInfo('ultimo_pull')
  const res = await chamar('/sync/pull?lastPulledAt=' + (ultima || 0))
  const dados = await lerResposta(res)
  if(!res.ok) throw new Error(dados.detail || 'erro ao baixar os dados')

  const mudancas = dados.changes || {}
  for(const tabela of ['routes', 'appointments', 'meeting_points']){
    const m = mudancas[tabela]
    if(!m) continue
    const novos = [...(m.created || []), ...(m.updated || [])]
    for(const r of novos){
      await salvar(tabela, {...r, expira_em: r.expira_em || Date.now() + VALIDADE[tabela]})
    }
    for(const id of m.deleted || []){
      await apagar(tabela, id)
    }
  }
  await salvarInfo('ultimo_pull', String(dados.timestamp || Date.now()))
}

export async function sincronizar(){
  if(sincronizando) return
  sincronizando = true
  try{
    await enviarFila()
    await baixarMudancas()
    await tirarVencidos()
  }finally{
    sincronizando = false
  }
}

export function ligarSincronizacao(){
  let estavaOnline = true
  return NetInfo.addEventListener((estado)=>{
    const online = !!estado.isConnected
    if(online && !estavaOnline) sincronizar().catch(()=>{})
    estavaOnline = online
  })
}
