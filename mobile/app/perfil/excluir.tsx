import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import NetInfo from '@react-native-community/netinfo'
import { chamar, lerResposta } from '../../src/api'
import { enviarFila } from '../../src/sincronizar'
import { useSessao } from '../../src/SessaoContext'
import { cores, fontes } from '../../src/cores'

export default function ExcluirConta(){
  const router = useRouter()
  const {sair} = useSessao()

  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [moedas, setMoedas] = useState<any>(null)
  const [enviando, setEnviando] = useState(false)

  async function excluir(aceitaMoedas = false){
    setErro('')
    if(!senha){
      setErro('Informe sua senha atual.')
      return
    }
    if(confirmacao != 'EXCLUIR'){
      setErro('Digite EXCLUIR em letras maiúsculas.')
      return
    }
    setEnviando(true)
    try{
      const corpo: any = {password: senha, confirmation: confirmacao}
      if(aceitaMoedas) corpo.acknowledgeCoins = true
      const res = await chamar('/me/deletion', {method: 'POST', body: JSON.stringify(corpo)})
      const d = await lerResposta(res)
      if(res.ok){
        try{
          const rede = await NetInfo.fetch()
          if(rede.isConnected) await enviarFila()
        }catch(e){}
        await sair()
        router.replace('/login')
        return
      }
      if(d.code == 'DELETION_BLOCKED'){
        const pendente = (d.pending || []).find((p: any)=> p.kind == 'COINS')
        if(pendente) setMoedas({quantidade: pendente.amount})
        else setErro(d.detail || 'Você tem pendências abertas. Resolva antes de excluir.')
      }else{
        setErro(d.detail || 'Não deu pra pedir a exclusão.')
      }
    }catch(e){
      setErro('Sem conexão. Confira a internet.')
    }
    setEnviando(false)
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS == 'ios' ? 'padding' : undefined}>
      <View style={styles.topo}>
        <TouchableOpacity style={styles.botaoicone} onPress={()=> router.back()} accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={8}>
          <Ionicons name="chevron-back" size={16} color={cores.branco}/>
        </TouchableOpacity>
        <Text style={styles.titulotopo}>Excluir conta</Text>
        <View style={{width:32}}/>
      </View>

      <ScrollView contentContainerStyle={{padding:24, gap:12}} keyboardShouldPersistTaps="handled">
        <View style={styles.alerta}>
          <Ionicons name="warning-outline" size={20} color={cores.vermelho}/>
          <Text style={[styles.texto, {flex:1}]}>Sua conta fica 30 dias em carência. Nesse tempo dá pra desistir falando com o suporte. Depois disso seus dados são apagados de vez.</Text>
        </View>
        <Text style={styles.caption}>Não dá pra excluir com negociação, leilão ou reclamação em aberto. Os dados deste aparelho são apagados na hora.</Text>

        <Text style={styles.rotulo}>Senha atual</Text>
        <TextInput style={styles.input} value={senha} onChangeText={setSenha} secureTextEntry autoCapitalize="none" accessibilityLabel="Senha atual"/>

        <Text style={styles.rotulo}>Digite EXCLUIR pra confirmar</Text>
        <TextInput style={styles.input} value={confirmacao} onChangeText={setConfirmacao} autoCapitalize="characters" autoCorrect={false} placeholder="EXCLUIR" placeholderTextColor={cores.placeholder} accessibilityLabel="Confirmação"/>

        {erro ? <Text style={styles.erro} accessibilityLiveRegion="polite">{erro}</Text> : null}

        {moedas ? (
          <View style={styles.caixamoedas}>
            <Text style={styles.titulo}>Você ainda tem {moedas.quantidade} moedas</Text>
            <Text style={styles.texto}>Se você excluir a conta, elas serão perdidas.</Text>
            <View style={[styles.linha, {gap:10}]}>
              <TouchableOpacity style={styles.botaosecundario} onPress={()=> setMoedas(null)} disabled={enviando} accessibilityRole="button">
                <Text style={styles.textobranco}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botao, {flex:1}]} onPress={()=> excluir(true)} disabled={enviando} accessibilityRole="button" accessibilityLabel="Excluir mesmo assim">
                {enviando ? <ActivityIndicator color={cores.fundo}/> : <Text style={styles.textobotao}>Excluir mesmo assim</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.botao} onPress={()=> excluir()} disabled={enviando} accessibilityRole="button" accessibilityLabel="Solicitar exclusão">
            {enviando ? <ActivityIndicator color={cores.fundo}/> : <Text style={styles.textobotao}>Solicitar exclusão</Text>}
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container:      {flex:1, backgroundColor:cores.fundo},
  topo:           {flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:24, paddingTop:42},
  botaoicone:     {width:32, height:32, borderWidth:1, borderColor:cores.borda, borderRadius:8, alignItems:'center', justifyContent:'center'},
  titulotopo:     {fontFamily:fontes.titulo, fontSize:18, color:cores.branco},
  alerta:         {flexDirection:'row', gap:10, padding:14, borderRadius:12, borderWidth:1, borderColor:cores.vermelho, backgroundColor:cores.vermelhoFraco},
  titulo:         {fontFamily:fontes.textoForte, fontSize:15, color:cores.branco},
  texto:          {fontFamily:fontes.texto, fontSize:14, lineHeight:20, color:cores.branco},
  caption:        {fontFamily:fontes.textoMedio, fontSize:11, lineHeight:15, color:cores.cinza},
  rotulo:         {fontFamily:fontes.texto, fontSize:13, color:cores.cinza, marginTop:6},
  input:          {minHeight:49, paddingHorizontal:16, borderRadius:12, borderWidth:1, borderColor:cores.borda, backgroundColor:cores.campo, color:cores.branco, fontFamily:fontes.texto, fontSize:15, letterSpacing:0},
  erro:           {fontFamily:fontes.texto, fontSize:13, color:cores.vermelho},
  caixamoedas:    {gap:10, padding:14, borderRadius:12, borderWidth:1, borderColor:cores.borda, backgroundColor:cores.card},
  linha:          {flexDirection:'row', alignItems:'center'},
  botao:          {height:48, paddingHorizontal:18, borderRadius:12, backgroundColor:cores.vermelho, alignItems:'center', justifyContent:'center', marginTop:8},
  textobotao:     {fontFamily:fontes.textoForte, fontSize:15, color:cores.branco},
  botaosecundario:{height:48, paddingHorizontal:18, borderRadius:12, borderWidth:1, borderColor:cores.borda, alignItems:'center', justifyContent:'center', marginTop:8},
  textobranco:    {fontFamily:fontes.textoForte, fontSize:15, color:cores.branco},
})
