import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, ActivityIndicator } from 'react-native'
import { useState, useCallback, useRef } from 'react'
import { useRouter, useFocusEffect } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { chamar, lerResposta } from '../../src/api'
import { useSessao } from '../../src/SessaoContext'
import { cores, fontes } from '../../src/cores'

function tempoDesde(data?: string){
  if(!data) return ''
  const t = new Date(data).getTime()
  if(isNaN(t)) return ''
  const dias = Math.floor((Date.now() - t) / 86400000)
  if(dias < 1) return 'hoje'
  if(dias < 30) return dias == 1 ? 'há 1 dia' : 'há ' + dias + ' dias'
  const meses = Math.floor(dias / 30)
  return meses == 1 ? 'há 1 mês' : 'há ' + meses + ' meses'
}

function Item({icone, titulo, texto, onPress, direita, rotulo, verde}: any){
  return (
    <TouchableOpacity style={styles.item} onPress={onPress} accessibilityRole="button" accessibilityLabel={rotulo || titulo}>
      <View style={[styles.icone, verde && {backgroundColor:cores.verdeForte}]}>
        <Ionicons name={icone} size={17} color={verde ? cores.verde : cores.branco}/>
      </View>
      <View style={{flex:1}}>
        <Text style={styles.titulo}>{titulo}</Text>
        <Text style={styles.caption}>{texto}</Text>
      </View>
      {direita ? direita : <Ionicons name="chevron-forward" size={16} color={cores.cinza}/>}
    </TouchableOpacity>
  )
}

export default function Seguranca(){
  const router = useRouter()
  const {sair} = useSessao()

  const [dados, setDados] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [modal, setModal] = useState<any>(null)
  const [codigos, setCodigos] = useState<string[]>([])
  const [erroModal, setErroModal] = useState('')
  const [enviando, setEnviando] = useState(false)
  const pedido = useRef(0)

  async function carregar(){
    setErro('')
    try{
      const res = await chamar('/me/security')
      const d = await lerResposta(res)
      if(res.ok) setDados(d)
      else setErro(d.detail || 'erro ao carregar a segurança da conta')
    }catch(e){
      setErro('Sem conexão. Confira a internet.')
    }
    setCarregando(false)
  }

  useFocusEffect(useCallback(()=>{
    carregar()
  },[]))

  function fechar(){
    pedido.current++
    setEnviando(false)
    setModal(null)
    setErroModal('')
  }

  async function confirmar(){
    const meu = ++pedido.current
    setErroModal('')
    setEnviando(true)
    try{
      if(modal.tipo == 'codigos'){
        const res = await chamar('/me/2fa/recovery-codes', {method: 'POST'})
        const d = await lerResposta(res)
        if(meu != pedido.current) return
        if(res.ok){
          setCodigos(d.codes || [])
          setModal({tipo: 'mostrarcodigos'})
        }else if(d.code == 'TWO_FACTOR_DISABLED'){
          setErroModal('Ative a verificação em duas etapas primeiro.')
        }else{
          setErroModal(d.detail || 'Não deu pra gerar os códigos.')
        }
      }

      if(modal.tipo == 'encerrar'){
        const res = await chamar('/me/sessions/' + modal.sessao.id, {method: 'DELETE'})
        if(meu != pedido.current) return
        if(res.ok){
          setModal(null)
          carregar()
        }else{
          const d = await lerResposta(res)
          setErroModal(d.detail || 'Não deu pra encerrar a sessão.')
        }
      }

      if(modal.tipo == 'todos'){
        const res = await chamar('/me/sessions', {method: 'DELETE'})
        if(meu != pedido.current) return
        if(res.ok){
          setModal(null)
          await sair()
          router.replace('/login')
        }else{
          const d = await lerResposta(res)
          setErroModal(d.detail || 'Não deu pra sair dos aparelhos.')
        }
      }
    }catch(e){
      if(meu != pedido.current) return
      setErroModal('Sem conexão. Confira a internet.')
    }
    setEnviando(false)
  }

  if(carregando){
    return <View style={styles.container}><ActivityIndicator color={cores.verde} style={{marginTop:80}}/></View>
  }

  if(erro || !dados){
    return (
      <View style={styles.container}>
        <View style={styles.vazio}>
          <Text style={styles.textovazio} accessibilityLiveRegion="polite">{erro}</Text>
          <TouchableOpacity style={styles.botao} onPress={()=>{ setCarregando(true); carregar() }} accessibilityRole="button">
            <Text style={styles.textobotao}>Tentar de novo</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const ativo = dados.twoFactor && dados.twoFactor.enabled
  const sessoes = dados.sessions || []
  const trocada = tempoDesde(dados.passwordChangedAt)

  let titulomodal = ''
  let textomodal = ''
  let textoConfirmar = ''
  if(modal && modal.tipo == 'codigos'){
    titulomodal = 'Gerar novos códigos?'
    textomodal = 'Os códigos antigos param de funcionar. Os novos aparecem uma vez só, então guarde num lugar seguro.'
    textoConfirmar = 'Gerar códigos'
  }
  if(modal && modal.tipo == 'encerrar'){
    titulomodal = 'Encerrar sessão?'
    textomodal = modal.sessao.device + ' vai precisar entrar de novo.'
    textoConfirmar = 'Encerrar'
  }
  if(modal && modal.tipo == 'todos'){
    titulomodal = 'Sair de todos os aparelhos?'
    textomodal = 'Todas as sessões são encerradas, inclusive esta. Você vai precisar entrar de novo.'
    textoConfirmar = 'Sair de todos'
  }

  return (
    <View style={styles.container}>
      <View style={styles.topo}>
        <TouchableOpacity style={styles.botaoicone} onPress={()=> router.back()} accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={8}>
          <Ionicons name="chevron-back" size={16} color={cores.branco}/>
        </TouchableOpacity>
        <Text style={styles.titulotopo}>Segurança</Text>
        <View style={{width:32}}/>
      </View>

      <ScrollView contentContainerStyle={{padding:24, gap:16}}>
        <View style={[styles.banner, !ativo && {backgroundColor:'rgba(255,90,95,0.05)', borderColor:'rgba(255,90,95,0.14)'}]}>
          <View style={[styles.tilebanner, !ativo && {backgroundColor:cores.vermelhoFraco}]}>
            <Ionicons name="shield-outline" size={22} color={ativo ? cores.verde : cores.vermelho}/>
          </View>
          <View style={{flex:1, gap:2}}>
            <Text style={styles.titulobanner}>{ativo ? 'Sua conta está protegida' : 'Sua conta pode ficar mais segura'}</Text>
            <Text style={styles.small}>{ativo ? '2FA ativo' : '2FA desligado'}{trocada ? ' · senha trocada ' + trocada : ''}</Text>
          </View>
        </View>

        <Text style={styles.grupo}>ACESSO</Text>
        <View style={styles.card}>
          <Item
            icone="phone-portrait-outline"
            titulo="Verificação em duas etapas"
            texto={ativo ? 'Aplicativo autenticador' : 'Desligada'}
            rotulo={'Verificação em duas etapas, ' + (ativo ? 'ligada' : 'desligada')}
            verde={ativo}
            onPress={()=> router.push('/perfil/doisfatores')}
            direita={
              <View style={[styles.chave, ativo && {backgroundColor:cores.verde}]}>
                <View style={[styles.bolinha, ativo ? {alignSelf:'flex-end'} : {backgroundColor:cores.cinza}]}/>
              </View>
            }
          />
          <View style={styles.divisor}/>
          <Item icone="lock-closed-outline" titulo="Alterar senha" texto="Mínimo de 10 caracteres" onPress={()=> router.push('/perfil/senha')}/>
          <View style={styles.divisor}/>
          <Item icone="sparkles-outline" titulo="Códigos de recuperação" texto="Gerar um novo conjunto" onPress={()=> setModal({tipo: 'codigos'})}/>
        </View>

        <View style={styles.linha}>
          <Text style={[styles.grupo, {flex:1}]}>SESSÕES ATIVAS</Text>
          <Text style={styles.caption}>{sessoes.length == 1 ? '1 aparelho' : sessoes.length + ' aparelhos'}</Text>
        </View>
        <View style={styles.card}>
          {sessoes.map((s: any, i: number)=>(
            <View key={s.id}>
              {i > 0 ? <View style={styles.divisor}/> : null}
              <View style={styles.item}>
                <View style={[styles.icone, s.current && {backgroundColor:cores.verdeForte}]}>
                  <Ionicons name={s.kind == 'mobile' ? 'phone-portrait-outline' : 'hardware-chip-outline'} size={17} color={s.current ? cores.verde : cores.branco}/>
                </View>
                <View style={{flex:1}}>
                  <Text style={styles.titulo}>{s.device}</Text>
                  <Text style={styles.caption}>{s.location} · {s.current ? 'agora' : tempoDesde(s.lastActiveAt)}</Text>
                </View>
                {s.current ? (
                  <View style={styles.chip}><Text style={styles.textochip}>Atual</Text></View>
                ) : (
                  <TouchableOpacity onPress={()=> setModal({tipo: 'encerrar', sessao: s})} style={styles.encerrar} accessibilityRole="button" accessibilityLabel={'Encerrar ' + s.device}>
                    <Text style={styles.textovermelho}>Encerrar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.botaovermelho} onPress={()=> setModal({tipo: 'todos'})} accessibilityRole="button" accessibilityLabel="Sair de todos os aparelhos">
          <Ionicons name="log-out-outline" size={17} color={cores.vermelho}/>
          <Text style={styles.textosair}>Sair de todos os aparelhos</Text>
        </TouchableOpacity>

        <View style={styles.linha}>
          <Ionicons name="mail-outline" size={13} color={cores.cinza}/>
          <Text style={[styles.caption, {flex:1}]}>Toda mudança de senha, 2FA ou sessão é registrada e avisada por e-mail.</Text>
        </View>

        <TouchableOpacity onPress={()=> router.push('/perfil/excluir')} style={styles.excluir} accessibilityRole="button" accessibilityLabel="Solicitar exclusão da conta">
          <Text style={styles.textovermelho}>Solicitar exclusão da conta</Text>
          <Ionicons name="chevron-forward" size={16} color={cores.vermelho}/>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={!!modal} transparent animationType="slide" onRequestClose={fechar}>
        <View style={styles.fundomodal}>
          <View style={styles.caixamodal}>
            {modal && modal.tipo == 'mostrarcodigos' ? (
              <>
                <Text style={styles.titulomodal}>Seus códigos de recuperação</Text>
                <Text style={styles.textomodal}>Eles aparecem só agora. Anote ou tire print e guarde fora do celular.</Text>
                <View style={styles.codigos}>
                  {codigos.map(c => <Text key={c} style={styles.codigo}>{c}</Text>)}
                </View>
                <TouchableOpacity style={styles.botao} onPress={()=>{ setCodigos([]); setModal(null) }} accessibilityRole="button">
                  <Text style={styles.textobotao}>Já guardei</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.titulomodal}>{titulomodal}</Text>
                <Text style={styles.textomodal}>{textomodal}</Text>
                {erroModal ? <Text style={styles.erro} accessibilityLiveRegion="polite">{erroModal}</Text> : null}
                <View style={[styles.linha, {gap:10, marginTop:8}]}>
                  <TouchableOpacity style={styles.botaosecundario} onPress={fechar} accessibilityRole="button">
                    <Text style={styles.textobranco}>Voltar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.botao, {flex:1}, modal && modal.tipo != 'codigos' ? {backgroundColor:cores.vermelho} : null]}
                    onPress={confirmar}
                    disabled={enviando}
                    accessibilityRole="button"
                    accessibilityLabel={textoConfirmar}
                  >
                    {enviando ? <ActivityIndicator color={cores.fundo}/> : <Text style={styles.textobotao}>{textoConfirmar}</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container:      {flex:1, backgroundColor:cores.fundo},
  topo:           {flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:24, paddingTop:42},
  botaoicone:     {width:32, height:32, borderWidth:1, borderColor:cores.borda, borderRadius:8, alignItems:'center', justifyContent:'center'},
  titulotopo:     {fontFamily:fontes.titulo, fontSize:18, color:cores.branco},
  banner:         {flexDirection:'row', alignItems:'center', gap:10, padding:14, borderRadius:18, borderWidth:1, borderColor:'rgba(29,219,106,0.14)', backgroundColor:cores.verdeFraco},
  tilebanner:     {width:44, height:44, borderRadius:12, backgroundColor:cores.verdeForte, alignItems:'center', justifyContent:'center'},
  titulobanner:   {fontFamily:fontes.tituloMedio, fontSize:16, color:cores.branco},
  small:          {fontFamily:fontes.texto, fontSize:13, color:cores.cinza},
  grupo:          {fontFamily:fontes.textoForte, fontSize:11, letterSpacing:0.6, color:cores.cinza},
  card:           {borderRadius:12, borderWidth:1, borderColor:cores.borda, backgroundColor:cores.card},
  item:           {flexDirection:'row', alignItems:'center', gap:12, paddingVertical:11, paddingHorizontal:14, minHeight:56},
  icone:          {width:34, height:34, borderRadius:8, backgroundColor:cores.cinzaFraco, alignItems:'center', justifyContent:'center'},
  divisor:        {height:1, backgroundColor:cores.borda, marginHorizontal:14},
  titulo:         {fontFamily:fontes.textoForte, fontSize:13, color:cores.branco},
  caption:        {fontFamily:fontes.textoMedio, fontSize:11, lineHeight:15, color:cores.cinza},
  chave:          {width:44, height:26, borderRadius:13, backgroundColor:cores.borda, padding:3, justifyContent:'center'},
  bolinha:        {width:20, height:20, borderRadius:10, backgroundColor:cores.fundo},
  linha:          {flexDirection:'row', alignItems:'center', gap:6},
  chip:           {height:22, paddingHorizontal:8, borderRadius:999, backgroundColor:cores.verdeForte, justifyContent:'center'},
  textochip:      {fontFamily:fontes.textoMedio, fontSize:11, color:cores.verde},
  encerrar:       {minHeight:44, justifyContent:'center', paddingHorizontal:6},
  textovermelho:  {fontFamily:fontes.textoForte, fontSize:13, color:cores.vermelho},
  botaovermelho:  {flexDirection:'row', gap:8, height:48, borderRadius:12, borderWidth:1, borderColor:'rgba(255,90,95,0.35)', backgroundColor:cores.campo, alignItems:'center', justifyContent:'center'},
  textosair:      {fontFamily:fontes.textoForte, fontSize:15, color:cores.vermelho},
  excluir:        {flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:10},
  vazio:          {alignItems:'center', gap:12, marginTop:80, paddingHorizontal:24},
  textovazio:     {fontFamily:fontes.texto, fontSize:14, color:cores.cinza, textAlign:'center'},
  botao:          {height:48, paddingHorizontal:18, borderRadius:12, backgroundColor:cores.verde, alignItems:'center', justifyContent:'center'},
  textobotao:     {fontFamily:fontes.textoForte, fontSize:15, color:cores.fundo},
  botaosecundario:{height:48, paddingHorizontal:18, borderRadius:12, borderWidth:1, borderColor:cores.borda, alignItems:'center', justifyContent:'center'},
  textobranco:    {fontFamily:fontes.textoForte, fontSize:15, color:cores.branco},
  fundomodal:     {flex:1, backgroundColor:cores.fundoModal, justifyContent:'flex-end'},
  caixamodal:     {backgroundColor:cores.card, padding:20, borderTopLeftRadius:18, borderTopRightRadius:18, gap:10},
  titulomodal:    {fontFamily:fontes.titulo, fontSize:18, color:cores.branco},
  textomodal:     {fontFamily:fontes.texto, fontSize:14, color:cores.branco},
  codigos:        {flexDirection:'row', flexWrap:'wrap', gap:8, marginVertical:6},
  codigo:         {fontFamily:fontes.textoMedio, fontSize:14, color:cores.verdeEsg, width:'47%', padding:8, borderRadius:8, backgroundColor:cores.campo},
  erro:           {fontFamily:fontes.texto, fontSize:13, color:cores.vermelho},
})
