import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { chamar, lerResposta } from '../../src/api'
import { cores, fontes } from '../../src/cores'

function problemasSenha(senha: string){
  const falta = []
  if(senha.length < 10) falta.push('10 caracteres')
  if(!/[A-Z]/.test(senha)) falta.push('uma letra maiúscula')
  if(!/\d/.test(senha)) falta.push('um número')
  if(!/[^A-Za-z0-9]/.test(senha)) falta.push('um caractere especial')
  return falta
}

function CampoSenha({rotulo, valor, mudar, erro}: any){
  const [ver, setVer] = useState(false)
  return (
    <View style={{gap:8}}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <View style={[styles.campo, erro ? {borderColor:cores.vermelho} : null]}>
        <TextInput
          style={styles.input}
          value={valor}
          onChangeText={mudar}
          secureTextEntry={!ver}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={rotulo}
        />
        <TouchableOpacity onPress={()=> setVer(!ver)} style={{padding:12}} accessibilityRole="button" accessibilityLabel={(ver ? 'Esconder ' : 'Mostrar ') + rotulo.toLowerCase()}>
          <Ionicons name={ver ? 'eye-off-outline' : 'eye-outline'} size={18} color={cores.cinza}/>
        </TouchableOpacity>
      </View>
      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
    </View>
  )
}

export default function AlterarSenha(){
  const router = useRouter()

  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erros, setErros] = useState<any>({})
  const [erroGeral, setErroGeral] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [pronto, setPronto] = useState(false)
  const relogio = useRef<any>(null)

  useEffect(()=>{
    return ()=> clearTimeout(relogio.current)
  }, [])

  function validar(){
    const e: any = {}
    if(!atual) e.atual = 'Informe sua senha atual.'
    const falta = problemasSenha(nova)
    if(nova.length > 128) e.nova = 'Use no máximo 128 caracteres.'
    else if(falta.length > 0) e.nova = 'A senha precisa de: ' + falta.join(', ') + '.'
    else if(nova == atual) e.nova = 'A nova senha precisa ser diferente da atual.'
    if(!e.nova && confirmar != nova) e.confirmar = 'As senhas não conferem.'
    setErros(e)
    return Object.keys(e).length == 0
  }

  async function salvar(){
    setErroGeral('')
    if(!validar()) return
    setEnviando(true)
    try{
      const res = await chamar('/me/password', {method: 'PUT', body: JSON.stringify({currentPassword: atual, newPassword: nova})})
      if(res.ok){
        setPronto(true)
        relogio.current = setTimeout(()=> router.back(), 1500)
      }else{
        const d = await lerResposta(res)
        if(d.code == 'CURRENT_PASSWORD_INVALID') setErros({atual: d.detail || 'Senha atual incorreta.'})
        else if(d.code == 'PASSWORD_REUSED') setErros({nova: d.detail || 'A nova senha precisa ser diferente da atual.'})
        else setErroGeral(d.detail || 'Não deu pra trocar a senha.')
      }
    }catch(e){
      setErroGeral('Sem conexão. Confira a internet.')
    }
    setEnviando(false)
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS == 'ios' ? 'padding' : undefined}>
      <View style={styles.topo}>
        <TouchableOpacity style={styles.botaoicone} onPress={()=> router.back()} accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={8}>
          <Ionicons name="chevron-back" size={16} color={cores.branco}/>
        </TouchableOpacity>
        <Text style={styles.titulotopo}>Alterar senha</Text>
        <View style={{width:32}}/>
      </View>

      <ScrollView contentContainerStyle={{padding:24, gap:16}} keyboardShouldPersistTaps="handled">
        <CampoSenha rotulo="Senha atual" valor={atual} mudar={setAtual} erro={erros.atual}/>
        <CampoSenha rotulo="Nova senha" valor={nova} mudar={setNova} erro={erros.nova}/>
        <Text style={styles.caption}>Mínimo de 10 caracteres, com letra maiúscula, número e caractere especial.</Text>
        <CampoSenha rotulo="Confirmar nova senha" valor={confirmar} mudar={setConfirmar} erro={erros.confirmar}/>

        <View style={styles.aviso}>
          <Ionicons name="information-circle-outline" size={16} color={cores.cinza}/>
          <Text style={[styles.caption, {flex:1}]}>Quando a senha muda, os outros aparelhos saem da conta. Este continua conectado.</Text>
        </View>

        {erroGeral ? <Text style={styles.erro} accessibilityLiveRegion="polite">{erroGeral}</Text> : null}
        {pronto ? <Text style={styles.sucesso} accessibilityLiveRegion="polite">Senha alterada. Mandamos um aviso pro seu e-mail.</Text> : null}

        <TouchableOpacity style={styles.botao} onPress={salvar} disabled={enviando || pronto} accessibilityRole="button" accessibilityLabel="Salvar nova senha">
          {enviando ? <ActivityIndicator color={cores.fundo}/> : <Text style={styles.textobotao}>Salvar nova senha</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container:  {flex:1, backgroundColor:cores.fundo},
  topo:       {flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:24, paddingTop:42},
  botaoicone: {width:32, height:32, borderWidth:1, borderColor:cores.borda, borderRadius:8, alignItems:'center', justifyContent:'center'},
  titulotopo: {fontFamily:fontes.titulo, fontSize:18, color:cores.branco},
  rotulo:     {fontFamily:fontes.texto, fontSize:13, color:cores.cinza},
  campo:      {flexDirection:'row', alignItems:'center', minHeight:49, paddingLeft:16, borderRadius:12, borderWidth:1, borderColor:cores.borda, backgroundColor:cores.campo},
  input:      {flex:1, color:cores.branco, fontFamily:fontes.texto, fontSize:15},
  caption:    {fontFamily:fontes.textoMedio, fontSize:11, lineHeight:15, color:cores.cinza},
  aviso:      {flexDirection:'row', gap:8, padding:12, borderRadius:12, backgroundColor:cores.cinzaFraco},
  erro:       {fontFamily:fontes.texto, fontSize:13, color:cores.vermelho},
  sucesso:    {fontFamily:fontes.textoForte, fontSize:13, color:cores.verde},
  botao:      {height:48, borderRadius:12, backgroundColor:cores.verde, alignItems:'center', justifyContent:'center'},
  textobotao: {fontFamily:fontes.textoForte, fontSize:15, color:cores.fundo},
})
