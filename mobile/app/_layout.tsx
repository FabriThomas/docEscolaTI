import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useFonts, SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk'
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans'
import { RascunhoProvider } from '../src/RascunhoContext'
import { USAR_MOCK } from '../src/api'
import { ligarMock } from '../src/mock'
import { cores } from '../src/cores'

if(USAR_MOCK) ligarMock()

export default function Layout(){
  const [carregou] = useFonts({
    SpaceGrotesk_500Medium, SpaceGrotesk_700Bold,
    DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold
  })

  if(!carregou) return null

  return (
    <RascunhoProvider>
      <StatusBar style="light"/>
      <Stack screenOptions={{headerShown:false, contentStyle:{backgroundColor: cores.fundo}}}/>
    </RascunhoProvider>
  )
}
