import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { cores, fontes } from './cores'

const DICAS = [
  'Coloque a peça num fundo liso',
  'Procure um lugar bem iluminado, sem flash estourando',
  'Segure o celular firme e espere focar',
  'A peça precisa ocupar boa parte da moldura',
]

export default function Recaptura({mensagem, uri, aoTirarDeNovo, aoCancelar}: {mensagem: string, uri?: string, aoTirarDeNovo: ()=>void, aoCancelar: ()=>void}){
  return (
    <View style={styles.container}>
      {uri ? <Image source={{uri}} style={styles.foto}/> : null}

      <View style={styles.alerta} accessibilityRole="alert">
        <Ionicons name="warning-outline" size={18} color={cores.vermelho}/>
        <Text style={styles.textoalerta}>{mensagem}</Text>
      </View>

      <Text style={styles.titulodicas}>Dicas para a próxima foto</Text>
      {DICAS.map(d => (
        <View key={d} style={styles.dica}>
          <Ionicons name="information-circle-outline" size={14} color={cores.cinza}/>
          <Text style={styles.textodica}>{d}</Text>
        </View>
      ))}

      <View style={{flexDirection:'row', marginTop:24}}>
        <TouchableOpacity style={styles.botaosecundario} onPress={aoCancelar} accessibilityRole="button" accessibilityLabel="Cancelar">
          <Text style={styles.textobranco}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.botao} onPress={aoTirarDeNovo} accessibilityRole="button" accessibilityLabel="Tirar de novo">
          <Text style={styles.textobotao}>Tirar de novo</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container:       {flex:1, backgroundColor:cores.fundo, paddingHorizontal:24, paddingTop:42},
  foto:            {width:'100%', height:220, borderRadius:12, borderWidth:1, borderColor:cores.borda, marginBottom:14},
  alerta:          {flexDirection:'row', gap:10, padding:12, borderRadius:12, backgroundColor:cores.vermelhoFraco},
  textoalerta:     {flex:1, fontFamily:fontes.textoForte, fontSize:14, color:cores.branco},
  titulodicas:     {fontFamily:fontes.textoForte, fontSize:13, color:cores.branco, marginTop:20, marginBottom:6},
  dica:            {flexDirection:'row', gap:6, marginTop:6},
  textodica:       {fontFamily:fontes.texto, fontSize:13, color:cores.cinza},
  botaosecundario: {height:48, paddingHorizontal:18, borderRadius:12, borderWidth:1, borderColor:cores.borda, backgroundColor:cores.campo, justifyContent:'center', marginRight:12},
  botao:           {flex:1, height:48, borderRadius:12, backgroundColor:cores.verde, alignItems:'center', justifyContent:'center'},
  textobranco:     {fontFamily:fontes.textoForte, fontSize:15, color:cores.branco},
  textobotao:      {fontFamily:fontes.textoForte, fontSize:15, color:cores.fundo},
})
