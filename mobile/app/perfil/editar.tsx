import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import * as ImagePicker from 'expo-image-picker'
import { chamar, lerResposta } from '../../src/api'
import { comprimirFoto, MAX_ENTRADA } from '../../src/foto'
import { cores, fontes } from '../../src/cores'

export function validarPerfil(nome: string, bio: string, regiao: string){
  const erros: any = {}
  const n = nome.trim()
  if(n.length < 2) erros.nome = 'Use pelo menos 2 caracteres.'
  else if(n.length > 40) erros.nome = 'Use no máximo 40 caracteres.'
  else if(/@|\d{4,}/.test(n)) erros.nome = 'Não use e-mail ou telefone no nome de exibição.'
  if(bio.length > 160) erros.bio = 'Use no máximo 160 caracteres.'
  if(regiao.trim() == '') erros.regiao = 'Escolha sua região.'
  return erros
}

function Dica({texto}: any){
  return (
    <View style={styles.linhadica}>
      <Ionicons name="information-circle-outline" size={13} color={cores.cinza}/>
      <Text style={styles.dica}>{texto}</Text>
    </View>
  )
}

export default function EditarPerfil(){
  const router = useRouter()

  const [perfil, setPerfil] = useState<any>(null)
  const [nome, setNome] = useState('')
  const [bio, setBio] = useState('')
  const [regiao, setRegiao] = useState('')
  const [erros, setErros] = useState<any>({})
  const [erroGeral, setErroGeral] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [enviandoFoto, setEnviandoFoto] = useState(false)

  useEffect(()=>{
    carregar()
  }, [])

  async function carregar(){
    setErroGeral('')
    try{
      const res = await chamar('/me/profile')
      const dados = await lerResposta(res)
      if(res.ok){
        setPerfil(dados)
        setNome(dados.displayName || '')
        setBio(dados.bio || '')
        setRegiao(dados.region || '')
      }else if(res.status != 401){
        setErroGeral(dados.detail || 'Não deu pra carregar seu perfil.')
      }
    }catch(e){
      setErroGeral('Sem conexão. Confira a internet.')
    }
  }

  async function trocarFoto(){
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if(!permissao.granted){
      setErroGeral('Precisamos de acesso às suas fotos pra trocar o avatar.')
      return
    }
    const res = await ImagePicker.launchImageLibraryAsync({mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1]})
    if(res.canceled || !res.assets || res.assets.length == 0) return
    const f: any = res.assets[0]
    if(f.fileSize && f.fileSize > MAX_ENTRADA){
      setErroGeral('A foto passa de 5 MB. Escolha outra.')
      return
    }
    setErroGeral('')
    setEnviandoFoto(true)
    try{
      const pronta = await comprimirFoto(f.uri, f.width, f.height)
      const form = new FormData()
      form.append('file', {uri: pronta.uri, name: 'avatar.webp', type: 'image/webp'} as any)
      const envio = await chamar('/me/avatar', {method: 'POST', body: form}, false)
      const dados = await lerResposta(envio)
      if(envio.ok) setPerfil((p: any)=> ({...p, avatarUrl: dados.avatarUrl}))
      else setErroGeral(dados.detail || 'Não deu pra trocar a foto.')
    }catch(e: any){
      setErroGeral(e.message || 'erro ao enviar a foto')
    }
    setEnviandoFoto(false)
  }

  async function salvar(){
    setErroGeral('')
    const novos = validarPerfil(nome, bio, regiao)
    setErros(novos)
    if(Object.keys(novos).length > 0) return
    setSalvando(true)
    try{
      const res = await chamar('/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({displayName: nome.trim(), bio: bio, region: regiao.trim(), version: perfil ? perfil.version : undefined})
      })
      const dados = await lerResposta(res)
      if(res.ok){
        router.back()
      }else if(res.status != 401){
        setErroGeral(dados.detail || 'Não deu pra salvar. Tente de novo.')
      }
    }catch(e){
      setErroGeral('Sem conexão. Confira a internet.')
    }
    setSalvando(false)
  }

  if(!perfil && !erroGeral){
    return (
      <View style={[styles.tela, {alignItems:'center', justifyContent:'center'}]}>
        <ActivityIndicator color={cores.verde}/>
      </View>
    )
  }

  if(!perfil){
    return (
      <View style={[styles.tela, {alignItems:'center', justifyContent:'center', paddingHorizontal:32}]}>
        <Ionicons name="cloud-offline-outline" size={36} color={cores.cinza}/>
        <Text style={styles.textoerro} accessibilityRole="alert">{erroGeral}</Text>
        <TouchableOpacity style={styles.botaotentar} onPress={carregar} accessibilityRole="button">
          <Text style={styles.textosecundario}>Tentar de novo</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={()=> router.back()} style={{marginTop:14}} accessibilityRole="button">
          <Text style={styles.contador}>Voltar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={styles.tela} behavior={Platform.OS == 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <View style={styles.topo}>
          <TouchableOpacity style={styles.botaoicone} onPress={()=> router.back()} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={8}>
            <Ionicons name="close" size={16} color={cores.branco}/>
          </TouchableOpacity>
          <Text style={styles.titulotopo}>Editar perfil</Text>
          <View style={{width:32}}/>
        </View>

        <View style={{alignItems:'center', marginTop:24}}>
          <TouchableOpacity onPress={trocarFoto} disabled={enviandoFoto || !perfil} accessibilityRole="button" accessibilityLabel="Alterar foto">
            {perfil.avatarUrl
              ? <Image source={{uri: perfil.avatarUrl}} style={styles.avatar}/>
              : <View style={styles.avatar}><Ionicons name="person-outline" size={34} color={cores.branco}/></View>}
            <View style={styles.camera}>
              {enviandoFoto ? <ActivityIndicator size="small" color={cores.fundo}/> : <Ionicons name="camera" size={13} color={cores.fundo}/>}
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={trocarFoto} disabled={enviandoFoto || !perfil} style={{marginTop:10}} accessible={false} importantForAccessibility="no">
            <Text style={styles.link}>Alterar foto</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.rotulo}>Nome de exibição <Text style={{color:cores.vermelho}}>*</Text></Text>
        <TextInput
          style={[styles.campo, erros.nome && styles.campoerro]}
          value={nome}
          onChangeText={setNome}
          maxLength={60}
          accessibilityLabel="Nome de exibição"
        />
        {erros.nome ? <Text style={styles.erro}>{erros.nome}</Text> : <Dica texto="Aparece no perfil, nos anúncios e no chat."/>}

        <View style={styles.linharotulo}>
          <Text style={[styles.rotulo, {marginTop:0}]}>Sobre você</Text>
          <Text style={[styles.contador, bio.length > 160 && {color:cores.vermelho}]}>{bio.length}/160</Text>
        </View>
        <TextInput
          style={[styles.campo, styles.campogrande, erros.bio && styles.campoerro]}
          value={bio}
          onChangeText={setBio}
          multiline
          textAlignVertical="top"
          accessibilityLabel="Sobre você"
        />
        {erros.bio ? <Text style={styles.erro}>{erros.bio}</Text> : null}

        <Text style={styles.rotulo}>Região <Text style={{color:cores.vermelho}}>*</Text></Text>
        <View style={[styles.campo, styles.camporegiao, erros.regiao && styles.campoerro]}>
          <Ionicons name="location-outline" size={16} color={cores.verde}/>
          <TextInput
            style={styles.inputregiao}
            value={regiao}
            onChangeText={setRegiao}
            placeholder="Ex.: Zona 7, Maringá – PR"
            placeholderTextColor={cores.placeholder}
            accessibilityLabel="Região"
          />
        </View>
        {erros.regiao ? <Text style={styles.erro}>{erros.regiao}</Text> : <Dica texto="Só o bairro aparece. Telefone, e-mail e endereço nunca ficam públicos."/>}

        <Text style={styles.rotulo}>E-mail</Text>
        <View style={[styles.campo, styles.campoemail]}>
          <Ionicons name="lock-closed-outline" size={15} color={cores.cinza}/>
          <Text style={styles.email}>{perfil.emailMasked}</Text>
          {perfil.emailVerified &&
            <View style={styles.chip}>
              <Ionicons name="checkmark" size={12} color={cores.verde}/>
              <Text style={styles.textochip}>Verificado</Text>
            </View>}
        </View>

        {erroGeral ? <Text style={[styles.erro, {marginTop:16}]} accessibilityRole="alert">{erroGeral}</Text> : null}
      </ScrollView>

      <View style={styles.rodape}>
        <TouchableOpacity style={styles.botaosecundario} onPress={()=> router.back()} accessibilityRole="button" accessibilityLabel="Cancelar">
          <Text style={styles.textosecundario}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.botao} onPress={salvar} disabled={salvando || !perfil} accessibilityRole="button" accessibilityLabel="Salvar alterações">
          {salvando
            ? <ActivityIndicator color={cores.fundo}/>
            : <View style={{flexDirection:'row', alignItems:'center'}}>
                <Ionicons name="checkmark" size={18} color={cores.fundo}/>
                <Text style={styles.textobotao}>Salvar alterações</Text>
              </View>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  tela:        {flex:1, backgroundColor:cores.fundo},
  conteudo:    {paddingHorizontal:20, paddingTop:56, paddingBottom:24},
  topo:        {flexDirection:'row', alignItems:'center', justifyContent:'space-between', height:32},
  botaoicone:  {width:32, height:32, borderWidth:1, borderColor:cores.borda, borderRadius:8, alignItems:'center', justifyContent:'center'},
  titulotopo:  {fontFamily:fontes.titulo, fontSize:18, color:cores.branco},
  avatar:      {width:76, height:76, borderRadius:38, borderWidth:2, borderColor:'rgba(29,219,106,0.6)', backgroundColor:cores.borda, alignItems:'center', justifyContent:'center'},
  camera:      {position:'absolute', right:-4, bottom:-4, width:28, height:28, borderRadius:14, backgroundColor:cores.verde, borderWidth:3, borderColor:cores.fundo, alignItems:'center', justifyContent:'center'},
  link:        {fontFamily:fontes.textoForte, fontSize:13, color:cores.verde},
  rotulo:      {fontFamily:fontes.texto, fontSize:13, color:cores.cinza, marginTop:20, marginBottom:8},
  linharotulo: {flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:20, marginBottom:8},
  contador:    {fontFamily:fontes.texto, fontSize:11, color:cores.cinza},
  campo:       {backgroundColor:cores.campo, borderWidth:1, borderColor:cores.borda, borderRadius:12, paddingHorizontal:16, minHeight:49, color:cores.branco, fontFamily:fontes.texto, fontSize:14, letterSpacing:0},
  campogrande: {minHeight:64, paddingTop:14, paddingBottom:14},
  campoerro:   {borderColor:cores.vermelho},
  camporegiao: {flexDirection:'row', alignItems:'center'},
  inputregiao: {flex:1, color:cores.branco, fontFamily:fontes.texto, fontSize:14, marginLeft:10, minHeight:47, letterSpacing:0},
  campoemail:  {flexDirection:'row', alignItems:'center', backgroundColor:'rgba(107,122,141,0.08)'},
  email:       {flex:1, fontFamily:fontes.texto, fontSize:14, color:cores.cinza, marginLeft:10},
  chip:        {flexDirection:'row', alignItems:'center', backgroundColor:cores.verdeForte, borderRadius:999, paddingHorizontal:8, height:22},
  textochip:   {fontFamily:fontes.textoMedio, fontSize:11, color:cores.verde, marginLeft:4},
  linhadica:   {flexDirection:'row', alignItems:'center', marginTop:6},
  dica:        {fontFamily:fontes.textoMedio, fontSize:11, color:cores.cinza, marginLeft:5, flex:1},
  erro:        {fontFamily:fontes.texto, fontSize:13, color:cores.vermelho, marginTop:6},
  textoerro:   {fontFamily:fontes.texto, fontSize:14, color:cores.cinza, textAlign:'center', marginTop:12},
  botaotentar: {borderWidth:1, borderColor:cores.borda, borderRadius:12, paddingHorizontal:18, height:44, justifyContent:'center', marginTop:16},
  rodape:      {flexDirection:'row', paddingHorizontal:20, paddingTop:12, paddingBottom:28, borderTopWidth:1, borderTopColor:cores.borda},
  botaosecundario: {height:48, borderRadius:12, borderWidth:1, borderColor:cores.borda, backgroundColor:cores.campo, paddingHorizontal:18, alignItems:'center', justifyContent:'center', marginRight:10},
  textosecundario: {fontFamily:fontes.textoForte, fontSize:15, color:cores.branco},
  botao:       {flex:1, height:48, borderRadius:12, backgroundColor:cores.verde, alignItems:'center', justifyContent:'center'},
  textobotao:  {fontFamily:fontes.textoForte, fontSize:15, color:cores.fundo, marginLeft:6},
})
