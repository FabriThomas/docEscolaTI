import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import { Tabs, Redirect, useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useSessao } from '../../src/SessaoContext'
import { cores, fontes } from '../../src/cores'

const ABAS: any[] = [
  {nome: 'inicio', texto: 'Início', icone: 'home-outline'},
  {nome: 'buscar', texto: 'Buscar', icone: 'search-outline'},
  {nome: 'anunciar', texto: 'Anunciar', icone: 'add'},
  {nome: 'chat', texto: 'Chat', icone: 'chatbubble-outline'},
  {nome: 'perfil', texto: 'Perfil', icone: 'person-outline'},
]

function Barra({state, navigation}: any){
  const router = useRouter()
  const atual = state.routes[state.index].name

  return (
    <View style={styles.barra}>
      {ABAS.map(a => {
        if(a.nome == 'anunciar'){
          return (
            <TouchableOpacity key={a.nome} style={styles.aba} onPress={()=> router.push('/anunciar/fotos')} accessibilityRole="button" accessibilityLabel="Anunciar">
              <View style={styles.mais}>
                <Ionicons name="add" size={22} color={cores.fundo}/>
              </View>
              <Text style={[styles.texto, {color:cores.cinza, marginTop:2}]}>Anunciar</Text>
            </TouchableOpacity>
          )
        }
        const ativa = atual == a.nome
        return (
          <TouchableOpacity key={a.nome} style={styles.aba} onPress={()=> navigation.navigate(a.nome)} accessibilityRole="tab" accessibilityState={{selected: ativa}} accessibilityLabel={a.texto}>
            <Ionicons name={a.icone} size={22} color={ativa ? cores.verde : cores.cinza}/>
            <Text style={[styles.texto, {color: ativa ? cores.verde : cores.cinza}]}>{a.texto}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

export default function Abas(){
  const {usuario, carregando} = useSessao()

  if(carregando) return null
  if(!usuario) return <Redirect href="/login"/>

  return (
    <Tabs screenOptions={{headerShown:false, sceneStyle:{backgroundColor:cores.fundo}}} tabBar={(props: any)=> <Barra {...props}/>}>
      <Tabs.Screen name="inicio"/>
      <Tabs.Screen name="buscar"/>
      <Tabs.Screen name="chat"/>
      <Tabs.Screen name="perfil"/>
    </Tabs>
  )
}

const styles = StyleSheet.create({
  barra:  {flexDirection:'row', height:84, backgroundColor:'rgba(13,27,42,0.96)', borderTopWidth:1, borderTopColor:cores.borda, paddingTop:10, paddingHorizontal:20, alignItems:'flex-start'},
  aba:    {flex:1, alignItems:'center', paddingTop:6},
  texto:  {fontFamily:fontes.textoMedio, fontSize:11, marginTop:4},
  mais:   {width:48, height:48, borderRadius:24, backgroundColor:cores.verde, alignItems:'center', justifyContent:'center', marginTop:-16},
})
