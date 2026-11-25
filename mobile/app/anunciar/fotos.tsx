import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Modal, Linking, ActivityIndicator } from 'react-native'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import Ionicons from '@expo/vector-icons/Ionicons'
import Topo from '../../src/Topo'
import Recaptura from '../../src/Recaptura'
import { useRascunho } from '../../src/RascunhoContext'
import { prepararFotos, MAX_FOTOS } from '../../src/foto'
import { URL_API, cabecalhos, lerResposta } from '../../src/api'
import { cores, fontes } from '../../src/cores'

export default function Fotos(){
  const router = useRouter()
  const {anuncio, setAnuncio} = useRascunho()
  const fotos = anuncio.fotos

  const [menuAberto, setMenuAberto] = useState(false)
  const [selecionada, setSelecionada] = useState('')
  const [semPermissao, setSemPermissao] = useState(false)
  const [preparando, setPreparando] = useState(false)
  const [erros, setErros] = useState<string[]>([])
  const [analisando, setAnalisando] = useState(false)
  const [aviso, setAviso] = useState('')
  const [candidatos, setCandidatos] = useState<any[]>([])
  const [recaptura, setRecaptura] = useState('')

  const noLimite = fotos.length >= MAX_FOTOS


  useEffect(()=>{
    ImagePicker.getPendingResultAsync().then((pendente: any)=>{
      if(pendente && !pendente.canceled && pendente.assets) adicionar(pendente.assets)
    }).catch(()=>{})
  },[])

  async function adicionar(assets: any[]){
    setPreparando(true)
    const lista = assets.slice(0, MAX_FOTOS - fotos.length)
    const resultado = await prepararFotos(lista)
    setAnuncio((a: any)=> ({...a, fotos: [...a.fotos, ...resultado.prontas].slice(0, MAX_FOTOS)}))
    setErros(resultado.erros)
    setPreparando(false)
  }

  async function escolherDaGaleria(){
    setMenuAberto(false)
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if(!permissao.granted){
      setSemPermissao(!permissao.canAskAgain)
      if(permissao.canAskAgain) alert('precisa liberar o acesso as fotos pra adicionar')
      return
    }
    setSemPermissao(false)

    try{
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: MAX_FOTOS - fotos.length,
        exif: true,
      })
      if(res.canceled) return
      await adicionar(res.assets)
    }catch(e){
      alert('erro ao abrir a galeria')
      setPreparando(false)
    }
  }

  function abrirCamera(){
    setMenuAberto(false)
    router.push('/anunciar/camera')
  }

  function preencher(dados: any, scanner: any, moedas: boolean){
    setAnuncio((a: any)=>{
      const novo = {...a, origem: {...a.origem}, scanner: scanner, ganhaMoedas: moedas}
      if(dados.titulo){ novo.titulo = dados.titulo; novo.origem.titulo = 'IA' }
      if(dados.categoria){ novo.categoria = dados.categoria; novo.origem.categoria = 'IA' }
      if(dados.especificacoes && dados.especificacoes.length > 0){ novo.especificacoes = dados.especificacoes; novo.origem.especificacoes = 'IA' }
      return novo
    })
  }

  async function usarScanner(){
    if(fotos.length == 0){
      abrirCamera()
      return
    }
    setAnalisando(true)
    setAviso('')
    setAnuncio((a: any)=> ({...a, scanner: null, ganhaMoedas: false}))
    try{
      const ids = []
      for(const f of fotos){
        const form = new FormData()
        form.append('file', {uri: f.uri, name: f.id + '.webp', type: 'image/webp'} as any)
        const res = await fetch(URL_API + '/media', {method: 'POST', headers: await cabecalhos(false), body: form})
        const dados = await lerResposta(res)
        if(!res.ok) throw new Error(dados.detail)
        ids.push(dados.mediaId)
      }

      let relogio: any
      const tempo = new Promise(r => { relogio = setTimeout(()=> r({decisionBand: 'CIRCUIT_OPEN_FALLBACK'}), 3500) })
      const chamada = fetch(URL_API + '/scanner/analyze', {method: 'POST', headers: await cabecalhos(), body: JSON.stringify({mediaIds: ids})})
        .then(lerResposta)
        .catch(()=> ({decisionBand: 'CIRCUIT_OPEN_FALLBACK'}))
      const r: any = await Promise.race([chamada, tempo])
      clearTimeout(relogio)

      if(r.decisionBand == 'AUTO_L5'){
        const s = r.sugestao || {}
        preencher(s, s.titulo ? {nome: s.titulo, confianca: r.confidence} : null, r.confidence >= 0.8)
        setAviso(`Detalhes preenchidos pela IA (${Math.round(r.confidence * 100)}% de confiança). Confira na próxima etapa.`)
      }else if(r.decisionBand == 'TOP3_HYPOTHESES'){
        setCandidatos((r.candidates || []).filter((c: any)=> c.score >= 0.25).slice(0, 3))
      }else if(r.decisionBand == 'MANUAL_CURATION'){
        if(r.categoria && r.categoriaConfianca >= 0.7) preencher({categoria: r.categoria}, null, false)
        setAviso('Não reconhecemos a peça. Preencha os detalhes e ela vai para a curadoria.')
      }else if(r.decisionBand == 'LOW_QUALITY_RECAPTURE'){
        setRecaptura(r.orientacao || 'A foto não ficou boa para o Scanner. Tire outra.')
      }else{
        setAviso('O Scanner está indisponível agora. Você pode preencher manualmente.')
      }
    }catch(e){
      alert('erro ao enviar as fotos pro scanner')
    }
    setAnalisando(false)
  }

  function escolher(c: any){
    if(c){
      preencher(c, {nome: c.titulo, confianca: c.score}, true)
      setAviso('Detalhes preenchidos pela IA. Confira na próxima etapa.')
    }else{
      setAviso('Tudo bem, preencha os detalhes na próxima etapa.')
    }
    setCandidatos([])
  }

  function remover(id: string){
    setAnuncio((a: any)=> ({...a, fotos: a.fotos.filter((f: any)=> f.id != id), scanner: null, ganhaMoedas: false}))
    setSelecionada('')
  }

  function virarCapa(id: string){
    const foto = fotos.find((f: any)=> f.id == id)
    setAnuncio((a: any)=> ({...a, fotos: [foto, ...a.fotos.filter((f: any)=> f.id != id)]}))
    setSelecionada('')
  }

  function mover(id: string, direcao: number){
    const lista = [...fotos]
    const i = lista.findIndex((f: any)=> f.id == id)
    const j = i + direcao
    if(i < 0 || j < 0 || j >= lista.length) return
    const aux = lista[i]
    lista[i] = lista[j]
    lista[j] = aux
    setAnuncio((a: any)=> ({...a, fotos: lista}))
  }

  function CardFoto({foto, i}: {foto: any, i: number}){
    const tamanho = i == 0 ? 212 : 101
    return(
      <TouchableOpacity
        style={[styles.foto, {width: tamanho, height: tamanho}, selecionada == foto.id && {borderColor: cores.verde}]}
        onPress={()=> setSelecionada(selecionada == foto.id ? '' : foto.id)}
        accessibilityRole="button"
        accessibilityLabel={'Foto ' + (i + 1)}
        accessibilityHint="Toque para mudar a ordem ou a capa"
      >
        <Image source={{uri: foto.uri}} style={{width: '100%', height: '100%', borderRadius: 12}}/>
        <View style={styles.ordem}><Text style={styles.textoordem}>{i + 1}</Text></View>
        <TouchableOpacity style={styles.remover} onPress={()=> remover(foto.id)} accessibilityRole="button" accessibilityLabel={'Remover foto ' + (i + 1)} hitSlop={12}>
          <Ionicons name="close" size={12} color={cores.branco}/>
        </TouchableOpacity>
        {i == 0 ?
          <View style={styles.capa}>
            <Ionicons name="image-outline" size={12} color={cores.verde}/>
            <Text style={styles.textocapa}>Capa</Text>
          </View>
        : null}
      </TouchableOpacity>
    )
  }

  if(recaptura != ''){
    return <Recaptura mensagem={recaptura} aoTirarDeNovo={()=>{ setRecaptura(''); abrirCamera() }} aoCancelar={()=> setRecaptura('')}/>
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <Topo etapa={1} subtitulo="Fotos do item"/>

        <TouchableOpacity style={styles.cardscanner} onPress={usarScanner} disabled={analisando} accessibilityRole="button" accessibilityLabel="Usar o Scanner IA">
          <View style={styles.iconescanner}>
            {analisando ? <ActivityIndicator color={cores.verde}/> : <Ionicons name="scan" size={22} color={cores.verde}/>}
          </View>
          <View style={{flex:1}}>
            <Text style={styles.tituloscanner}>Use o Scanner IA</Text>
            <Text style={styles.textopequeno}>Fotografe a etiqueta e a IA preenche os detalhes. <Text style={{color: cores.verdeEsg}}>Você pode ganhar moedas</Text></Text>
          </View>
        </TouchableOpacity>

        {aviso != '' && <Text style={styles.aviso}>{aviso}</Text>}

        <View style={styles.linhafotos}>
          <Text style={styles.label}>Suas fotos</Text>
          <Text style={styles.contador}><Text style={{color: cores.branco}}>{fotos.length}</Text> de {MAX_FOTOS}</Text>
        </View>

        <View style={styles.grade}>
          {fotos.map((f: any, i: number)=> <CardFoto key={f.id} foto={f} i={i}/>)}

          <TouchableOpacity style={[styles.adicionar, noLimite && {opacity:0.4}]} onPress={()=> setMenuAberto(true)} disabled={noLimite} accessibilityRole="button" accessibilityLabel="Adicionar foto" accessibilityState={{disabled: noLimite}}>
            <Ionicons name="camera-outline" size={22} color={cores.verde}/>
            <Text style={styles.textoadicionar}>Adicionar</Text>
          </TouchableOpacity>
        </View>

        {selecionada != '' ?
          <View style={styles.acoes}>
            <TouchableOpacity style={styles.botaopequeno} onPress={()=> virarCapa(selecionada)} accessibilityRole="button" accessibilityLabel="Definir como capa">
              <Text style={styles.textobotaopequeno}>Definir como capa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botaopequeno} onPress={()=> mover(selecionada, -1)} accessibilityRole="button" accessibilityLabel="Mover para antes">
              <Text style={styles.textobotaopequeno}>Mover para antes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botaopequeno} onPress={()=> mover(selecionada, 1)} accessibilityRole="button" accessibilityLabel="Mover para depois">
              <Text style={styles.textobotaopequeno}>Mover para depois</Text>
            </TouchableOpacity>
          </View>
        : null}

        {preparando &&
          <View style={styles.linhaaviso}>
            <ActivityIndicator color={cores.verde}/>
            <Text style={styles.textopequeno}>Preparando as fotos...</Text>
          </View>
        }

        {noLimite && <Text style={styles.aviso}>Você chegou no limite de {MAX_FOTOS} fotos.</Text>}

        {erros.map((e, i)=> <Text key={i} style={styles.erro}>{e}</Text>)}

        {semPermissao &&
          <View style={styles.cardpermissao}>
            <Text style={styles.textopequeno}>O acesso às fotos está bloqueado. Libere nos ajustes do celular.</Text>
            <TouchableOpacity style={styles.botaopequeno} onPress={()=> Linking.openSettings()} accessibilityRole="button" accessibilityLabel="Abrir ajustes">
              <Text style={styles.textobotaopequeno}>Abrir ajustes</Text>
            </TouchableOpacity>
          </View>
        }

        <View style={styles.dica}>
          <Ionicons name="information-circle-outline" size={14} color={cores.cinza}/>
          <Text style={styles.textodica}>Toque numa foto para mudar a ordem ou a capa. JPG, PNG ou HEIC até 5 MB; a localização das fotos é removida.</Text>
        </View>
      </ScrollView>

      <View style={styles.rodape}>
        <TouchableOpacity
          style={[styles.botao, (fotos.length == 0 || preparando) && {opacity:0.5}]}
          onPress={()=> router.push('/anunciar/detalhes')}
          disabled={fotos.length == 0 || preparando}
          accessibilityRole="button"
          accessibilityLabel="Continuar"
          accessibilityState={{disabled: fotos.length == 0 || preparando}}
        >
          <Text style={styles.textobotao}>Continuar</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={menuAberto} transparent={true} animationType="slide" onRequestClose={()=> setMenuAberto(false)}>
        <View style={styles.fundomodal}>
          <View style={styles.caixamodal}>
            <Text style={styles.titulomodal}>Adicionar foto</Text>
            <TouchableOpacity style={styles.opcao} onPress={abrirCamera} accessibilityRole="button" accessibilityLabel="Tirar foto com a câmera">
              <Ionicons name="camera-outline" size={18} color={cores.verde}/>
              <Text style={styles.textoopcao}>Tirar foto com a câmera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.opcao} onPress={escolherDaGaleria} accessibilityRole="button" accessibilityLabel="Escolher da galeria">
              <Ionicons name="images-outline" size={18} color={cores.verde}/>
              <Text style={styles.textoopcao}>Escolher da galeria</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={()=> setMenuAberto(false)} style={{alignItems:'center', padding:12}} accessibilityRole="button" accessibilityLabel="Cancelar">
              <Text style={{color: cores.cinza, fontFamily: fontes.textoForte}}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={candidatos.length > 0} transparent={true} animationType="slide" onRequestClose={()=> escolher(null)}>
        <View style={styles.fundomodal}>
          <View style={styles.caixamodal}>
            <Text style={styles.titulomodal}>Qual dessas é a sua peça?</Text>
            <Text style={styles.textopequeno}>O Scanner ficou em dúvida. Escolha a opção certa.</Text>
            {candidatos.map((c)=> (
              <TouchableOpacity key={c.titulo} style={styles.opcao} onPress={()=> escolher(c)} accessibilityRole="button" accessibilityLabel={c.titulo}>
                <View style={{flex:1}}>
                  <Text style={styles.textoopcao}>{c.titulo}</Text>
                  <Text style={styles.textopequeno}>{c.categoria} · {Math.round(c.score * 100)}%</Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.opcao} onPress={()=> escolher(null)} accessibilityRole="button" accessibilityLabel="Nenhuma das opções">
              <Text style={styles.textoopcao}>Nenhuma das opções</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container:      {flex:1, backgroundColor:cores.fundo},
  conteudo:       {paddingHorizontal:24, paddingTop:42, paddingBottom:24},
  cardscanner:    {flexDirection:'row', alignItems:'center', padding:14, borderRadius:18, backgroundColor:cores.verdeMedio, borderWidth:1, borderColor:'rgba(29,219,106,0.2)', marginTop:14},
  iconescanner:   {width:44, height:44, borderRadius:12, backgroundColor:cores.verdeForte, alignItems:'center', justifyContent:'center', marginRight:12},
  tituloscanner:  {fontFamily:fontes.tituloMedio, fontSize:16, color:cores.branco},
  textopequeno:   {fontFamily:fontes.texto, fontSize:13, lineHeight:18, color:cores.cinza},
  linhafotos:     {flexDirection:'row', justifyContent:'space-between', marginTop:14},
  label:          {fontFamily:fontes.textoForte, fontSize:13, color:cores.branco},
  contador:       {fontFamily:fontes.textoMedio, fontSize:11, color:cores.cinza},
  grade:          {flexDirection:'row', flexWrap:'wrap', gap:10, marginTop:10},
  foto:           {borderRadius:12, borderWidth:1, borderColor:cores.borda, backgroundColor:cores.card},
  ordem:          {position:'absolute', top:6, left:6, width:20, height:20, borderRadius:10, backgroundColor:cores.fundoFoto, alignItems:'center', justifyContent:'center'},
  textoordem:     {fontFamily:fontes.textoForte, fontSize:11, color:cores.branco},
  remover:        {position:'absolute', top:6, right:6, width:22, height:22, borderRadius:11, backgroundColor:cores.fundoFoto, alignItems:'center', justifyContent:'center'},
  capa:           {position:'absolute', left:8, bottom:8, height:22, paddingHorizontal:8, borderRadius:999, backgroundColor:cores.fundoFoto, flexDirection:'row', alignItems:'center', gap:4},
  textocapa:      {fontFamily:fontes.textoMedio, fontSize:11, color:cores.verde},
  adicionar:      {width:101, height:101, borderRadius:12, borderWidth:1.5, borderStyle:'dashed', borderColor:cores.verde, backgroundColor:cores.verdeFraco, alignItems:'center', justifyContent:'center'},
  textoadicionar: {fontFamily:fontes.textoMedio, fontSize:11, color:cores.verde, marginTop:4},
  acoes:          {flexDirection:'row', flexWrap:'wrap', gap:8, marginTop:12},
  botaopequeno:   {minHeight:44, paddingHorizontal:12, borderRadius:8, borderWidth:1, borderColor:cores.borda, backgroundColor:cores.campo, justifyContent:'center'},
  textobotaopequeno:{fontFamily:fontes.textoForte, fontSize:13, color:cores.branco},
  linhaaviso:     {flexDirection:'row', alignItems:'center', gap:8, marginTop:12},
  aviso:          {fontFamily:fontes.texto, fontSize:13, color:cores.verdeEsg, marginTop:12},
  erro:           {fontFamily:fontes.texto, fontSize:13, color:cores.vermelho, marginTop:8},
  cardpermissao:  {padding:14, borderRadius:12, borderWidth:1, borderColor:cores.borda, backgroundColor:cores.card, marginTop:12, gap:10},
  dica:           {flexDirection:'row', gap:6, marginTop:14},
  textodica:      {flex:1, fontFamily:fontes.textoMedio, fontSize:11, lineHeight:14, color:cores.cinza},
  rodape:         {paddingTop:14, paddingHorizontal:24, paddingBottom:26, borderTopWidth:1, borderColor:cores.borda, backgroundColor:cores.fundo},
  botao:          {height:48, borderRadius:12, backgroundColor:cores.verde, alignItems:'center', justifyContent:'center'},
  textobotao:     {fontFamily:fontes.textoForte, fontSize:15, color:cores.fundo},
  fundomodal:     {flex:1, backgroundColor:cores.fundoModal, justifyContent:'flex-end'},
  caixamodal:     {backgroundColor:cores.card, padding:20, borderTopLeftRadius:18, borderTopRightRadius:18, gap:10},
  titulomodal:    {fontFamily:fontes.titulo, fontSize:18, color:cores.branco, marginBottom:4},
  opcao:          {flexDirection:'row', alignItems:'center', gap:12, padding:14, minHeight:48, borderRadius:12, borderWidth:1, borderColor:cores.borda, backgroundColor:cores.campo},
  textoopcao:     {fontFamily:fontes.textoForte, fontSize:15, color:cores.branco},
  paragrafo:      {marginTop:24, fontSize:18},
})
