import { createContext, useContext, useEffect, useState } from 'react'
import { URL_API, chamar, lerResposta, renovarToken, quandoExpirar } from './api'
import { lerAccess, lerRefresh, salvarTokens, salvarChavePublica } from './secureStorage'
import { limparAparelho } from './limpeza'
import { ligarSincronizacao } from './sincronizar'

const SessaoContext = createContext<any>(null)

export function SessaoProvider({children}: any){
  const [usuario, setUsuario] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(()=>{
    quandoExpirar(async ()=>{
      await limparAparelho()
      setUsuario(null)
    })
    iniciar()
  }, [])

  useEffect(()=>{
    if(!usuario) return
    const desligar = ligarSincronizacao()
    return desligar
  }, [usuario])

  async function iniciar(){
    try{
      const access = await lerAccess()
      const refresh = await lerRefresh()
      if(!access && !refresh){
        setCarregando(false)
        return
      }
      if(!access){
        const resultado = await renovarToken()
        if(resultado != 'ok'){
          if(resultado == 'invalido') await limparAparelho()
          setCarregando(false)
          return
        }
      }
      const res = await chamar('/me')
      if(res.ok) setUsuario(await lerResposta(res))
    }catch(e){
      alert('erro ao abrir sua sessão, entre de novo')
    }
    setCarregando(false)
  }

  async function entrar(dados: any){
    await salvarTokens(dados.accessToken, dados.refreshToken)
    if(dados.qrPublicKey){
      try{
        await salvarChavePublica(dados.qrPublicKey)
      }catch(e){}
    }
    setUsuario(dados.user)
  }

  async function sair(){
    const access = await lerAccess()
    const refresh = await lerRefresh()
    await limparAparelho()
    setUsuario(null)
    const h: any = {'Content-Type': 'application/json'}
    if(access) h.Authorization = 'Bearer ' + access
    fetch(URL_API + '/auth/logout', {method: 'POST', headers: h, body: JSON.stringify({refreshToken: refresh})}).catch(()=>{})
  }

  return (
    <SessaoContext.Provider value={{usuario, carregando, entrar, sair, setUsuario}}>
      {children}
    </SessaoContext.Provider>
  )
}

export function useSessao(){
  return useContext(SessaoContext)
}
