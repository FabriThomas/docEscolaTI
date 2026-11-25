import { synchronize } from '@nozbe/watermelondb/sync'
import { Q } from '@nozbe/watermelondb'
import NetInfo from '@react-native-community/netinfo'
import { banco } from './banco'
import { chamar, lerResposta } from './api'

let sincronizando = false

export async function enviarFila(){
  const fila: any[] = await banco.get('pending_mutations').query(Q.where('is_deleted', false)).fetch()
  for(const m of fila){
    try{
      const res = await chamar(m.caminho, {method: 'POST', headers: {'Idempotency-Key': m.idempotencyKey}, body: m.corpo})
      if(res.status == 401) return
      const dados = await lerResposta(res)
      if(res.ok || dados.code == 'IDEMPOTENCY_KEY_REUSED'){
        await banco.write(async ()=>{ await m.destroyPermanently() })
      }else if(dados.code != 'IDEMPOTENCY_IN_PROGRESS'){
        await banco.write(async ()=>{ await m.update((x: any)=>{ x.tentativas = x.tentativas + 1 }) })
      }
    }catch(e){
      return
    }
  }
}

export async function sincronizar(){
  if(sincronizando) return
  sincronizando = true
  try{
    await enviarFila()
    await synchronize({
      database: banco,
      pullChanges: async ({lastPulledAt})=>{
        const res = await chamar('/sync/pull?lastPulledAt=' + (lastPulledAt || 0))
        const dados = await lerResposta(res)
        if(!res.ok) throw new Error(dados.detail || 'erro ao baixar os dados')
        return {changes: dados.changes, timestamp: dados.timestamp}
      },
      pushChanges: async ({changes, lastPulledAt})=>{
        const res = await chamar('/sync/push?lastPulledAt=' + lastPulledAt, {method: 'POST', body: JSON.stringify(changes)})
        if(!res.ok){
          const dados = await lerResposta(res)
          throw new Error(dados.detail || 'erro ao enviar os dados')
        }
      },
    })
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
