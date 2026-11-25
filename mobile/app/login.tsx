import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { URL_API, lerResposta } from '../src/api'
import { useSessao } from '../src/SessaoContext'
import { cores, fontes } from '../src/cores'

function identificadorValido(texto: string){
  const t = texto.trim()
  if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return true
  return t.replace(/\D/g, '').length == 11
}

export default function Login(){
  const router = useRouter()
  const {entrar} = useSessao()

  const [identificador, setIdentificador] = useState('')
  const [senha, setSenha] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [bloqueado, setBloqueado] = useState(false)

  const relogio = useRef<any>(null)

  const [desafio, setDesafio] = useState('')
  const [codigo, setCodigo] = useState('')

  useEffect(()=>{
    return ()=> clearTimeout(relogio.current)
  }, [])

  async function terminar(dados: any){
    await entrar(dados)
    router.replace('/perfil')
  }

  async function logar(){
    setErro('')
    if(!identificadorValido(identificador)){
      setErro('Informe um e-mail ou CPF válido.')
      return
    }
    if(!senha){
      setErro('Preencha este campo.')
      return
    }
    setCarregando(true)
    try{
      const res = await fetch(URL_API + '/auth/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({identifier: identificador.trim(), password: senha})
      })
      const dados = await lerResposta(res)
      if(res.ok){
        if(dados.status == 'TWO_FACTOR_REQUIRED'){
          setDesafio(dados.challengeId)
        }else{
          await terminar(dados)
        }
      }else if(dados.code == 'LOGIN_LOCKED'){
        const segundos = Number(res.headers.get('Retry-After')) || dados.retryAfter || 900
        const minutos = Math.ceil(segundos / 60)
        setBloqueado(true)
        clearTimeout(relogio.current)
        relogio.current = setTimeout(()=>{ setBloqueado(false); setErro('') }, segundos * 1000)
        setErro('Muitas tentativas. Tente de novo em ' + minutos + ' minutos. Mandamos um aviso pro seu e-mail.')
      }else if(dados.code == 'CAPTCHA_REQUIRED'){
        setErro('Depois de 3 tentativas erradas precisamos confirmar que você é humano. Tente de novo pelo site por enquanto.')
      }else if(dados.code == 'ACCOUNT_NOT_VERIFIED'){
        setErro('Confirme seu e-mail antes de entrar.')
      }else if(dados.code == 'ACCOUNT_IN_GRACE_PERIOD'){
        setErro('Sua conta está em exclusão. Fale com o suporte pra cancelar.')
      }else{
        setErro('E-mail, CPF ou senha incorretos.')
      }
    }catch(e){
      setErro('Sem conexão. Confira a internet.')
    }
    setCarregando(false)
  }

  async function confirmarCodigo(){
    setErro('')
    if(!/^\d{6}$/.test(codigo)){
      setErro('O código tem 6 números.')
      return
    }
    setCarregando(true)
    try{
      const res = await fetch(URL_API + '/auth/login/2fa', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({challengeId: desafio, code: codigo})
      })
      const dados = await lerResposta(res)
      if(res.ok) await terminar(dados)
      else setErro(dados.detail || 'Código inválido.')
    }catch(e){
      setErro('Sem conexão. Confira a internet.')
    }
    setCarregando(false)
  }

  function emBreve(){
    alert('Isso ainda não está pronto no app.')
  }

  if(desafio){
    return (
      <View style={styles.tela}>
        <TouchableOpacity style={styles.botaoicone} onPress={()=>{ setDesafio(''); setCodigo(''); setErro('') }} accessibilityRole="button" accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={16} color={cores.branco}/>
        </TouchableOpacity>
        <Text style={[styles.titulo, {marginTop:32}]}>Verificação em duas etapas</Text>
        <Text style={styles.subtitulo}>Digite o código de 6 números do seu aplicativo autenticador.</Text>

        <Text style={[styles.rotulo, {marginTop:28}]}>Código</Text>
        <TextInput
          style={[styles.campo, styles.campocodigo]}
          value={codigo}
          onChangeText={t => setCodigo(t.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          placeholder="000000"
          placeholderTextColor={cores.placeholder}
          accessibilityLabel="Código de verificação"
          autoFocus
        />
        {erro ? <Text style={styles.erro} accessibilityRole="alert">{erro}</Text> : null}

        <TouchableOpacity style={styles.botao} onPress={confirmarCodigo} disabled={carregando} accessibilityRole="button">
          {carregando ? <ActivityIndicator color={cores.fundo}/> : <Text style={styles.textobotao}>Confirmar código</Text>}
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={{flex:1, backgroundColor:cores.fundo}} behavior={Platform.OS == 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.tela} keyboardShouldPersistTaps="handled">
        <Image source={require('../assets/logo-steely.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="Steely"/>

        <Text style={styles.titulo}>Acesse sua conta</Text>
        <Text style={styles.subtitulo}>Conectando hardware com propósito.</Text>

        <Text style={[styles.rotulo, {marginTop:28}]}>E-mail ou CPF</Text>
        <TextInput
          style={styles.campo}
          value={identificador}
          onChangeText={setIdentificador}
          placeholder="Digite seu e-mail ou CPF"
          placeholderTextColor={cores.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          accessibilityLabel="E-mail ou CPF"
        />

        <Text style={[styles.rotulo, {marginTop:16}]}>Senha</Text>
        <View style={styles.linhasenha}>
          <TextInput
            style={[styles.campo, {flex:1, borderWidth:0}]}
            value={senha}
            onChangeText={setSenha}
            placeholder="Digite sua senha"
            placeholderTextColor={cores.placeholder}
            secureTextEntry={!verSenha}
            autoCapitalize="none"
            accessibilityLabel="Senha"
          />
          <TouchableOpacity onPress={()=> setVerSenha(!verSenha)} style={{padding:12}} accessibilityRole="button" accessibilityLabel={verSenha ? 'Esconder senha' : 'Mostrar senha'}>
            <Ionicons name={verSenha ? 'eye-off-outline' : 'eye-outline'} size={18} color={cores.cinza}/>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={emBreve} style={{alignSelf:'flex-end', marginTop:10}} accessibilityRole="button">
          <Text style={styles.link}>Esqueci minha senha</Text>
        </TouchableOpacity>

        {erro ? <Text style={styles.erro} accessibilityRole="alert">{erro}</Text> : null}

        <TouchableOpacity style={[styles.botao, bloqueado && {opacity:0.5}]} onPress={logar} disabled={carregando || bloqueado} accessibilityRole="button">
          {carregando ? <ActivityIndicator color={cores.fundo}/> : <Text style={styles.textobotao}>Entrar na plataforma</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={emBreve} style={{alignSelf:'center', marginTop:14}} accessibilityRole="button">
          <Text style={styles.link}>Entrar com código temporário</Text>
        </TouchableOpacity>

        <View style={styles.ou}>
          <View style={styles.linha}/>
          <Text style={styles.textoou}>ou continue com</Text>
          <View style={styles.linha}/>
        </View>

        <TouchableOpacity style={[styles.botaosecundario, styles.botaogoogle]} onPress={emBreve} accessibilityRole="button">
          <Ionicons name="logo-google" size={16} color={cores.branco}/>
          <Text style={[styles.textosecundario, {marginLeft:8}]}>Continuar com Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.botaosecundario, styles.botaocriar]} onPress={emBreve} accessibilityRole="button">
          <Text style={[styles.textosecundario, {color:cores.verde}]}>Criar uma nova conta</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={emBreve} style={{marginTop:16, alignSelf:'center'}} accessibilityRole="button">
          <Text style={styles.textocinza}>Explorar sem conta</Text>
        </TouchableOpacity>

        <Text style={styles.termos}>
          Ao continuar, você concorda com nossos{'\n'}
          <Text style={styles.sublinhado}>Termos de Uso</Text> e <Text style={styles.sublinhado}>Política de Privacidade</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  tela:       {flexGrow:1, backgroundColor:cores.fundo, paddingHorizontal:24, paddingTop:64, paddingBottom:32},
  logo:       {width:94, height:30, marginBottom:28},
  titulo:     {fontFamily:fontes.titulo, fontSize:24, color:cores.branco},
  subtitulo:  {fontFamily:fontes.texto, fontSize:13, color:cores.cinza, marginTop:6},
  rotulo:     {fontFamily:fontes.texto, fontSize:13, color:cores.branco, marginBottom:8},
  campo:      {backgroundColor:cores.borda, borderRadius:12, paddingHorizontal:16, minHeight:49, color:cores.branco, fontFamily:fontes.texto, fontSize:14},
  campocodigo:{fontSize:24, letterSpacing:8, textAlign:'center'},
  linhasenha: {flexDirection:'row', alignItems:'center', backgroundColor:cores.borda, borderRadius:12},
  link:       {fontFamily:fontes.textoMedio, fontSize:13, color:cores.verde},
  erro:       {fontFamily:fontes.texto, fontSize:13, color:cores.vermelho, marginTop:14},
  botao:      {backgroundColor:cores.verde, height:48, borderRadius:12, alignItems:'center', justifyContent:'center', marginTop:20},
  textobotao: {fontFamily:fontes.textoForte, fontSize:15, color:cores.fundo},
  botaosecundario: {flexDirection:'row', height:48, borderRadius:12, borderWidth:1, borderColor:cores.borda, alignItems:'center', justifyContent:'center', marginTop:12},
  botaogoogle:{backgroundColor:cores.borda},
  botaocriar: {borderColor:cores.verde, marginTop:16},
  textosecundario: {fontFamily:fontes.textoMedio, fontSize:14, color:cores.branco},
  ou:         {flexDirection:'row', alignItems:'center', marginTop:24, marginBottom:4},
  linha:      {flex:1, height:1, backgroundColor:cores.borda},
  textoou:    {fontFamily:fontes.texto, fontSize:11, color:cores.cinza, marginHorizontal:10},
  textocinza: {fontFamily:fontes.texto, fontSize:13, color:cores.cinza},
  termos:     {fontFamily:fontes.texto, fontSize:11, color:cores.cinza, textAlign:'center', marginTop:28, lineHeight:16},
  sublinhado: {textDecorationLine:'underline', color:cores.branco},
  botaoicone: {width:32, height:32, borderWidth:1, borderColor:cores.borda, borderRadius:8, alignItems:'center', justifyContent:'center'},
})
