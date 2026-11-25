import { StyleSheet, Text, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { cores, fontes } from './cores'

export default function EmBreve({titulo, icone}: {titulo: string, icone: any}){
  return (
    <View style={styles.tela}>
      <Text style={styles.titulo}>{titulo}</Text>
      <View style={styles.meio}>
        <Ionicons name={icone} size={40} color={cores.cinza}/>
        <Text style={styles.texto}>Essa parte do app ainda está sendo feita.</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  tela:   {flex:1, backgroundColor:cores.fundo, paddingHorizontal:20, paddingTop:56},
  titulo: {fontFamily:fontes.titulo, fontSize:26, color:cores.branco},
  meio:   {flex:1, alignItems:'center', justifyContent:'center'},
  texto:  {fontFamily:fontes.texto, fontSize:14, color:cores.cinza, marginTop:12, textAlign:'center'},
})
