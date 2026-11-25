import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { cores, fontes } from './cores'

const ETAPAS = ['Fotos', 'Detalhes', 'Preço e entrega', 'Revisão']

export default function Topo({etapa, subtitulo}: {etapa: number, subtitulo: string}){
  const router = useRouter()

  return (
    <View>
      <View style={styles.linha}>
        <TouchableOpacity style={styles.botaoicone} onPress={()=> router.back()} accessibilityRole="button" accessibilityLabel={etapa == 1 ? 'Fechar' : 'Voltar'} hitSlop={8}>
          <Ionicons name={etapa == 1 ? 'close' : 'chevron-back'} size={16} color={cores.branco}/>
        </TouchableOpacity>
        <Text style={styles.titulotopo}>Criar anúncio</Text>
        <View style={{width:32}}/>
      </View>

      <View style={{marginTop:24}}>
        <Text style={styles.etapa}>ETAPA {etapa} DE 4</Text>
        <Text style={styles.titulogrande}>{subtitulo}</Text>

        <View style={styles.barras}>
          {[1,2,3,4].map(n => (
            <View key={n} style={[styles.barra, {backgroundColor: n <= etapa ? cores.verde : cores.borda}]}/>
          ))}
        </View>
        <View style={styles.nomes}>
          {ETAPAS.map((nome, i)=> (
            <Text key={nome} style={[styles.nome, {color: i+1 == etapa ? cores.verde : i+1 < etapa ? cores.branco : cores.cinza}]}>{nome}</Text>
          ))}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  linha:        {flexDirection:'row', alignItems:'center', justifyContent:'space-between', height:32},
  botaoicone:   {width:32, height:32, borderWidth:1, borderColor:cores.borda, borderRadius:8, alignItems:'center', justifyContent:'center'},
  titulotopo:   {fontFamily:fontes.textoForte, fontSize:15, color:cores.branco},
  etapa:        {fontFamily:fontes.textoMedio, fontSize:11, color:cores.verde, letterSpacing:0.6},
  titulogrande: {fontFamily:fontes.titulo, fontSize:24, lineHeight:30, color:cores.branco, marginTop:4},
  barras:       {flexDirection:'row', marginTop:14},
  barra:        {flex:1, height:4, borderRadius:999, marginHorizontal:3},
  nomes:        {flexDirection:'row', justifyContent:'space-between', marginTop:8},
  nome:         {fontFamily:fontes.textoMedio, fontSize:11},
})
