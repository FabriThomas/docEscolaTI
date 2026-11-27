import { Stack, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { useFonts, SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk'
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans'
import { RascunhoProvider } from '../src/RascunhoContext'
import { SessaoProvider, useSessao } from '../src/SessaoContext'
import { USAR_MOCK } from '../src/api'
import { ligarMock } from '../src/mock'
import { cores } from '../src/cores'

if(USAR_MOCK) ligarMock()

function Guarda(){
  const {usuario, carregando} = useSessao()
  const segmentos = useSegments()
  const router = useRouter()

  useEffect(()=>{
    if(carregando) return
    const naLogin = segmentos[0] == 'login'
    if(!usuario && !naLogin) router.replace('/login')
    if(usuario && naLogin) router.replace('/perfil')
  }, [usuario, carregando, segmentos])

  return null
}

export default function Layout(){
  const [carregou] = useFonts({
    SpaceGrotesk_500Medium, SpaceGrotesk_700Bold,
    DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold
  })

  if(!carregou) return null

  return (
    <SessaoProvider>
      <RascunhoProvider>
        <StatusBar style="light"/>
        <Guarda/>
        <Stack screenOptions={{headerShown:false, contentStyle:{backgroundColor: cores.fundo}}}/>
      </RascunhoProvider>
    </SessaoProvider>
  )
}
