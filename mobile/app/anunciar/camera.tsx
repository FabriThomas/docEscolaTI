import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useState, useRef } from 'react'
import { useRouter } from 'expo-router'
import { CameraView, useCameraPermissions } from 'expo-camera'
import Ionicons from '@expo/vector-icons/Ionicons'
import Recaptura from '../../src/Recaptura'
import { useRascunho } from '../../src/RascunhoContext'
import { prepararFotos, MAX_FOTOS } from '../../src/foto'
import { cores, fontes } from '../../src/cores'

export default function Camera(){
  const router = useRouter()
  const [permissao, pedirPermissao] = useCameraPermissions()
  const camera = useRef<any>(null)
  const {anuncio, setAnuncio} = useRascunho()

  const [tirando, setTirando] = useState(false)
  const [fotoRuim, setFotoRuim] = useState<any>(null)

  async function tirarFoto(){
    if(tirando || !camera.current) return
    if(anuncio.fotos.length >= MAX_FOTOS){
      router.back()
      return
    }
    setTirando(true)
    try{
      const foto = await camera.current.takePictureAsync({quality: 0.8, exif: true})
      const {prontas, erros} = await prepararFotos([{...foto, mimeType: 'image/jpeg'}])

      if(erros.length > 0){
        setFotoRuim({uri: foto.uri, mensagem: erros[0]})
      }else{
        setAnuncio((a: any)=> ({...a, fotos: [...a.fotos, prontas[0]].slice(0, MAX_FOTOS)}))
        router.back()
      }
    }catch(e){
      alert('erro ao tirar a foto, tenta de novo')
    }
    setTirando(false)
  }

  if(!permissao){
    return (
      <View style={styles.centro}>
        <ActivityIndicator color={cores.verde}/>
        <Text style={styles.texto}>Carregando câmera...</Text>
      </View>
    )
  }

  if(!permissao.granted){
    return (
      <View style={styles.centro}>
        <Text style={styles.texto}>Precisamos da câmera para fotografar a peça.</Text>
        <TouchableOpacity style={styles.botao} onPress={pedirPermissao} accessibilityRole="button" accessibilityLabel="Permitir câmera">
          <Text style={styles.textobotao}>Permitir câmera</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={()=> router.back()} style={{padding:12}} accessibilityRole="button" accessibilityLabel="Voltar">
          <Text style={styles.texto}>Voltar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if(fotoRuim){
    return <Recaptura mensagem={fotoRuim.mensagem} uri={fotoRuim.uri} aoTirarDeNovo={()=> setFotoRuim(null)} aoCancelar={()=> router.back()}/>
  }

  return (
    <View style={{flex:1, backgroundColor: cores.fundoEscuro}}>
      <CameraView ref={camera} style={{flex:1}} facing="back"/>

      <View style={styles.sobreposicao} pointerEvents="box-none">
        <View style={styles.topo}>
          <TouchableOpacity style={styles.botaoicone} onPress={()=> router.back()} accessibilityRole="button" accessibilityLabel="Fechar câmera">
            <Ionicons name="close" size={16} color={cores.branco}/>
          </TouchableOpacity>
          <Text style={styles.titulo}>Fotografar peça</Text>
          <View style={{width:32}}/>
        </View>

        <View style={styles.moldura} accessibilityLabel="Moldura de enquadramento"/>

        <View style={styles.instrucao}>
          <Text style={styles.textoinstrucao}>Encaixe a peça inteira dentro da moldura</Text>
        </View>

        <View style={styles.baixo}>
          <Text style={styles.contador}>{anuncio.fotos.length} de {MAX_FOTOS}</Text>
          <TouchableOpacity style={[styles.disparador, tirando && {opacity:0.5}]} onPress={tirarFoto} disabled={tirando} accessibilityRole="button" accessibilityLabel="Tirar foto">
            {tirando ? <ActivityIndicator color={cores.fundo}/> : <Ionicons name="camera" size={24} color={cores.fundo}/>}
          </TouchableOpacity>
          <View style={{width:60}}/>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  centro:         {flex:1, backgroundColor:cores.fundo, alignItems:'center', justifyContent:'center', padding:24, gap:12},
  texto:          {fontFamily:fontes.texto, fontSize:14, color:cores.cinza, textAlign:'center'},
  botao:          {height:48, paddingHorizontal:24, borderRadius:12, backgroundColor:cores.verde, alignItems:'center', justifyContent:'center'},
  textobotao:     {fontFamily:fontes.textoForte, fontSize:15, color:cores.fundo},
  sobreposicao:   {position:"absolute", top:0, left:0, right:0, bottom:0, justifyContent:'space-between', paddingTop:42, paddingBottom:32},
  topo:           {flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:24},
  botaoicone:     {width:32, height:32, borderRadius:8, borderWidth:1, borderColor:cores.borda, backgroundColor:cores.fundoFoto, alignItems:'center', justifyContent:'center'},
  titulo:         {fontFamily:fontes.textoForte, fontSize:15, color:cores.branco},
  moldura:        {alignSelf:'center', width:'72%', aspectRatio:3/4, borderRadius:12, borderWidth:1.5, borderStyle:'dashed', borderColor:cores.verde},
  instrucao:      {alignSelf:'center', paddingHorizontal:12, paddingVertical:6, borderRadius:999, backgroundColor:cores.fundoFoto},
  textoinstrucao: {fontFamily:fontes.textoMedio, fontSize:13, color:cores.branco},
  baixo:          {flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:24},
  contador:       {width:60, fontFamily:fontes.textoMedio, fontSize:13, color:cores.branco},
  disparador:     {width:64, height:64, borderRadius:32, backgroundColor:cores.verde, alignItems:'center', justifyContent:'center'},
})
