import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { useState, useCallback } from 'react'
import { useRouter, useFocusEffect } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { chamar, lerResposta } from '../../src/api'
import { cores, fontes } from '../../src/cores'

export default function DoisFatores(){
  const router = useRouter()

  const [ativo, setAtivo] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)
  const [chave, setChave] = useState<any>(null)
  const [codigo, setCodigo] = useState('')
  const [senha, setSenha] = useState('')
  const [codigos, setCodigos] = useState<string[]>([])
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [desligou, setDesligou] = useState(false)

  async function carregar(){
    try{
      const res = await chamar('/me/security')
      const d = await lerResposta(res)
      if(res.ok) setAtivo(!!(d.twoFactor && d.twoFactor.enabled))
      else setErro(d.detail || 'erro ao carregar a verificação em duas etapas')
    }catch(e){
      setErro('Sem conexão. Confira a internet.')
    }
    setCarregando(false)
  }

  useFocusEffect(useCallback(()=>{
    carregar()
  },[]))

  async function comecar(){
    setErro('')
    setEnviando(true)
    try{
      const res = await chamar('/me/2fa/setup', {method: 'POST', body: JSON.stringify({method: 'APP'})})
      const d = await lerResposta(res)
      if(res.ok) setChave(d)
      else setErro(d.detail || 'Não deu pra começar a configuração.')
    }catch(e){
      setErro('Sem conexão. Confira a internet.')
    }
    setEnviando(false)
  }

  async function ativar(){
    setErro('')
    if(!/^\d{6}$/.test(codigo)){
      setErro('O código tem 6 números.')
      return
    }
    setEnviando(true)
    try{
      const res = await chamar('/me/2fa/enable', {method: 'POST', body: JSON.stringify({code: codigo})})
      const d = await lerResposta(res)
      if(res.ok){
        setCodigos(d.codes || [])
        setChave(null)
        setCodigo('')
      }else{
        setErro(d.detail || 'Código inválido.')
      }
    }catch(e){
      setErro('Sem conexão. Confira a internet.')
    }
    setEnviando(false)
  }

  async function desligar(){
    setErro('')
    if(!senha){
      setErro('Informe sua senha atual.')
      return
    }
    if(!/^\d{6}$/.test(codigo)){
      setErro('O código tem 6 números.')
      return
    }
    setEnviando(true)
    try{
      const res = await chamar('/me/2fa/disable', {method: 'POST', body: JSON.stringify({password: senha, code: codigo})})
      if(res.ok){
        setDesligou(true)
        setAtivo(false)
      }else{
        const d = await lerResposta(res)
        setErro(d.detail || 'Não deu pra desligar.')
      }
    }catch(e){
      setErro('Sem conexão. Confira a internet.')
    }
    setEnviando(false)
  }

  const campoCodigo = (
    <TextInput
      style={[styles.input, styles.inputcodigo]}
      value={codigo}
      onChangeText={t => setCodigo(t.replace(/\D/g, '').slice(0, 6))}
      keyboardType="number-pad"
      placeholder="000000"
      placeholderTextColor={cores.placeholder}
      accessibilityLabel="Código de 6 números"
    />
  )

  let conteudo = null

  if(carregando){
    conteudo = <ActivityIndicator color={cores.verde} style={{marginTop:40}}/>
  }else if(ativo === null){
    conteudo = (
      <>
        <Text style={styles.texto} accessibilityLiveRegion="polite">{erro || 'Não deu pra carregar a verificação.'}</Text>
        <TouchableOpacity style={styles.botao} onPress={()=>{ setErro(''); setCarregando(true); carregar() }} accessibilityRole="button">
          <Text style={styles.textobotao}>Tentar de novo</Text>
        </TouchableOpacity>
      </>
    )
}else if(codigos.length > 0){
    conteudo = (
      <>
        <Text style={styles.titulo}>Verificação ativada</Text>
        <Text style={styles.texto}>Guarde estes códigos de recuperação. Eles aparecem só agora e servem pra entrar se você perder o celular.</Text>
        <View style={styles.codigos}>
          {codigos.map(c => <Text key={c} style={styles.codigo}>{c}</Text>)}
        </View>
        <TouchableOpacity style={styles.botao} onPress={()=> router.back()} accessibilityRole="button">
          <Text style={styles.textobotao}>Já guardei</Text>
        </TouchableOpacity>
      </>
    )
  }else if(desligou){
    conteudo = (
      <>
        <Text style={styles.titulo}>Verificação desligada</Text>
        <Text style={styles.texto}>Sua conta agora entra só com a senha. Mandamos um aviso pro seu e-mail.</Text>
        <TouchableOpacity style={styles.botao} onPress={()=> router.back()} accessibilityRole="button">
          <Text style={styles.textobotao}>Voltar pra segurança</Text>
        </TouchableOpacity>
      </>
    )
  }else if(ativo){
    conteudo = (
      <>
        <Text style={styles.titulo}>Desligar verificação</Text>
        <Text style={styles.texto}>Pra desligar, confirme sua senha e um código do aplicativo autenticador.</Text>
        <Text style={styles.rotulo}>Senha atual</Text>
        <TextInput style={styles.input} value={senha} onChangeText={setSenha} secureTextEntry autoCapitalize="none" accessibilityLabel="Senha atual"/>
        <Text style={styles.rotulo}>Código</Text>
        {campoCodigo}
        {erro ? <Text style={styles.erro} accessibilityLiveRegion="polite">{erro}</Text> : null}
        <TouchableOpacity style={[styles.botao, {backgroundColor:cores.vermelho}]} onPress={desligar} disabled={enviando} accessibilityRole="button" accessibilityLabel="Desligar verificação">
          {enviando ? <ActivityIndicator color={cores.fundo}/> : <Text style={styles.textobotao}>Desligar verificação</Text>}
        </TouchableOpacity>
      </>
    )
  }else if(chave){
    conteudo = (
      <>
        <Text style={styles.titulo}>Adicione no autenticador</Text>
        <Text style={styles.texto}>Abra o Google Authenticator ou outro app parecido e adicione a chave abaixo.</Text>
        <Text style={styles.rotulo}>Chave manual</Text>
        <Text style={styles.chave} selectable>{chave.secret}</Text>
        <Text style={styles.caption}>{chave.otpauthUrl}</Text>
        <Text style={styles.rotulo}>Código que apareceu no app</Text>
        {campoCodigo}
        {erro ? <Text style={styles.erro} accessibilityLiveRegion="polite">{erro}</Text> : null}
        <TouchableOpacity style={styles.botao} onPress={ativar} disabled={enviando} accessibilityRole="button" accessibilityLabel="Ativar verificação">
          {enviando ? <ActivityIndicator color={cores.fundo}/> : <Text style={styles.textobotao}>Ativar verificação</Text>}
        </TouchableOpacity>
      </>
    )
  }else{
    conteudo = (
      <>
        <Text style={styles.titulo}>Verificação em duas etapas</Text>
        <Text style={styles.texto}>Além da senha, o login pede um código do aplicativo autenticador. Assim ninguém entra só com a sua senha.</Text>
        {erro ? <Text style={styles.erro} accessibilityLiveRegion="polite">{erro}</Text> : null}
        <TouchableOpacity style={styles.botao} onPress={comecar} disabled={enviando} accessibilityRole="button" accessibilityLabel="Configurar verificação">
          {enviando ? <ActivityIndicator color={cores.fundo}/> : <Text style={styles.textobotao}>Configurar verificação</Text>}
        </TouchableOpacity>
      </>
    )
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS == 'ios' ? 'padding' : undefined}>
      <View style={styles.topo}>
        <TouchableOpacity style={styles.botaoicone} onPress={()=> router.back()} accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={8}>
          <Ionicons name="chevron-back" size={16} color={cores.branco}/>
        </TouchableOpacity>
        <Text style={styles.titulotopo}>Duas etapas</Text>
        <View style={{width:32}}/>
      </View>
      <ScrollView contentContainerStyle={{padding:24, gap:12}} keyboardShouldPersistTaps="handled">
        {conteudo}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container:  {flex:1, backgroundColor:cores.fundo},
  topo:       {flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:24, paddingTop:42},
  botaoicone: {width:32, height:32, borderWidth:1, borderColor:cores.borda, borderRadius:8, alignItems:'center', justifyContent:'center'},
  titulotopo: {fontFamily:fontes.titulo, fontSize:18, color:cores.branco},
  titulo:     {fontFamily:fontes.titulo, fontSize:22, color:cores.branco},
  texto:      {fontFamily:fontes.texto, fontSize:14, lineHeight:20, color:cores.branco},
  rotulo:     {fontFamily:fontes.texto, fontSize:13, color:cores.cinza, marginTop:6},
  caption:    {fontFamily:fontes.textoMedio, fontSize:11, lineHeight:15, color:cores.cinza},
  input:      {minHeight:49, paddingHorizontal:16, borderRadius:12, borderWidth:1, borderColor:cores.borda, backgroundColor:cores.campo, color:cores.branco, fontFamily:fontes.texto, fontSize:15},
  inputcodigo:{fontSize:22, letterSpacing:8, textAlign:'center'},
  chave:      {fontFamily:fontes.textoForte, fontSize:16, letterSpacing:2, color:cores.verdeEsg, padding:12, borderRadius:12, backgroundColor:cores.campo},
  codigos:    {flexDirection:'row', flexWrap:'wrap', gap:8},
  codigo:     {fontFamily:fontes.textoMedio, fontSize:14, color:cores.verdeEsg, width:'47%', padding:8, borderRadius:8, backgroundColor:cores.campo},
  erro:       {fontFamily:fontes.texto, fontSize:13, color:cores.vermelho},
  botao:      {height:48, borderRadius:12, backgroundColor:cores.verde, alignItems:'center', justifyContent:'center', marginTop:8},
  textobotao: {fontFamily:fontes.textoForte, fontSize:15, color:cores.fundo},
})
