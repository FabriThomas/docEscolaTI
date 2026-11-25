import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, FlatList, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { useState, useCallback, useRef } from 'react'
import { useRouter, useFocusEffect } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useRascunho, rascunhoVazio, reais, paraCentavos, ESTADOS } from '../../src/RascunhoContext'
import { URL_API, cabecalhos, lerResposta } from '../../src/api'
import { cores, fontes } from '../../src/cores'

const NOMES_STATUS: any = {
  ATIVA: 'Ativo',
  EM_TRIAGEM: 'Em análise',
  PAUSADA: 'Pausado',
  EXPIRADA: 'Expirado',
  REMOVIDA: 'Removido',
  VENDIDA: 'Vendido',
}

const FILTROS = ['TODOS', 'ATIVA', 'EM_TRIAGEM', 'PAUSADA', 'EXPIRADA', 'REMOVIDA', 'VENDIDA']

const DIA = 86400000

function plural(n: number, um: string, varios: string){
  return n == 1 ? '1 ' + um : n + ' ' + varios
}

function diasDesde(data?: string){
  if(!data) return 0
  const t = new Date(data).getTime()
  if(isNaN(t)) return 0
  return Math.floor((Date.now() - t) / DIA)
}

function passouDoPrazo(data?: string){
  if(!data) return false
  const t = new Date(data).getTime()
  if(isNaN(t)) return false
  return Date.now() - t > 30 * DIA
}

export default function MeusAnuncios(){
  const router = useRouter()
  const {setAnuncio} = useRascunho()

  const [lista, setLista] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [filtro, setFiltro] = useState('TODOS')
  const jaCarregou = useRef(false)

  const [modal, setModal] = useState<any>(null)
  const [motivo, setMotivo] = useState('')
  const [preco, setPreco] = useState('')
  const [estado, setEstado] = useState('')
  const [erroModal, setErroModal] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function carregar(){
    if(!jaCarregou.current) setCarregando(true)
    setErro('')
    try{
      const res = await fetch(URL_API + '/offers/me', {headers: await cabecalhos()})
      const dados = await lerResposta(res)
      if(!res.ok){
        if(!jaCarregou.current) setErro(dados.detail || 'erro ao carregar seus anuncios')
      }else{
        setLista(dados.data || [])
        jaCarregou.current = true
      }
    }catch(e){
      if(!jaCarregou.current) setErro('Sem conexão. Confira a internet.')
    }
    setCarregando(false)
  }

  useFocusEffect(useCallback(()=>{
    carregar()
  },[]))

  function abrir(tipo: string, a: any){
    setModal({tipo: tipo, anuncio: a})
    setMotivo('')
    setPreco(reais(a.priceCents))
    setEstado(a.operationalState || '')
    setErroModal('')
  }

  function fechar(){
    if(enviando) return
    setModal(null)
  }

  async function confirmar(){
    if(!modal || enviando) return
    const a = modal.anuncio
    let caminho = ''
    let body: any = {}

    if(modal.tipo == 'pausar'){
      if(!motivo.trim()){ setErroModal('Informe o motivo'); return }
      caminho = '/offers/' + a.id + '/pause'
      body = {reason: motivo.trim()}
    }
    if(modal.tipo == 'reabrir'){
      const cents = paraCentavos(preco)
      if(!cents){ setErroModal('Informe o preço'); return }
      if(!estado){ setErroModal('Escolha o estado de conservação'); return }
      caminho = '/offers/' + a.id + '/reactivate'
      body = {priceCents: cents, operationalState: estado}
    }
    if(modal.tipo == 'excluir') caminho = '/offers/' + a.id + '/cancel'

    setEnviando(true)
    try{
      const res = await fetch(URL_API + caminho, {method: 'POST', headers: await cabecalhos(), body: JSON.stringify(body)})
      const dados = await lerResposta(res)
      if(res.ok){
        setModal(null)
        carregar()
      }else{
        setErroModal(dados.detail || 'erro, tente de novo')
      }
    }catch(e){
      setErroModal('Sem conexão. Tente de novo.')
    }
    setEnviando(false)
  }

  function criarCopia(a: any){
    setAnuncio({...rascunhoVazio, titulo: a.title, precoCents: a.priceCents, estado: a.operationalState || '', bairro: a.neighborhood || ''})
    router.push('/anunciar/fotos')
  }

  function novoAnuncio(){
    setAnuncio(rascunhoVazio)
    router.push('/anunciar/fotos')
  }

  function Card({a}: {a: any}){
    const podeEditar = a.status == 'ATIVA' || a.status == 'PAUSADA' || a.status == 'EM_TRIAGEM'
    const passou = passouDoPrazo(a.closedAt)
    return (
      <View style={styles.card}>
        <View style={styles.linha}>
          <Text style={[styles.titulo, {flex:1}]} numberOfLines={2}>{a.title}</Text>
          <View style={[styles.status, {backgroundColor: a.status == 'ATIVA' ? cores.verdeForte : a.status == 'REMOVIDA' ? cores.vermelhoFraco : cores.cinzaFraco}]}>
            <Text style={[styles.textostatus, {color: a.status == 'ATIVA' ? cores.verde : a.status == 'REMOVIDA' ? cores.vermelho : cores.branco}]}>{NOMES_STATUS[a.status] || a.status}</Text>
          </View>
        </View>
        <Text style={styles.preco}>R$ {reais(a.priceCents)}</Text>
        <View style={[styles.linha, {gap:12}]}>
          <View style={styles.linha}><Ionicons name="eye-outline" size={13} color={cores.cinza}/><Text style={styles.caption}>{a.views}</Text></View>
          <View style={styles.linha}><Ionicons name="chatbubble-outline" size={13} color={cores.cinza}/><Text style={styles.caption}>{a.chats}</Text></View>
          {a.openProposals > 0 ? <Text style={styles.caption}>{plural(a.openProposals, 'proposta', 'propostas')}</Text> : null}
        </View>

        {a.status == 'PAUSADA' ? <Text style={styles.caption}>Pausado há {plural(diasDesde(a.pausedAt), 'dia', 'dias')} · encerra sozinho com 30 dias</Text> : null}
        {a.status == 'EM_TRIAGEM' ? <Text style={styles.caption}>Passando pela moderação automática.</Text> : null}
        {a.status == 'REMOVIDA' ? <Text style={[styles.caption, {color:cores.vermelho}]}>Removido pela moderação: {a.moderationReason || ''}</Text> : null}

        <View style={styles.acoes}>
          {podeEditar && (
            <TouchableOpacity style={styles.acao} onPress={()=> router.push('/anuncios/' + a.id)} accessibilityRole="button" accessibilityLabel={'Editar ' + a.title}>
              <Ionicons name="create-outline" size={14} color={cores.branco}/>
              <Text style={styles.textoacao}>Editar</Text>
            </TouchableOpacity>
          )}
          {a.status == 'ATIVA' && (
            <TouchableOpacity style={styles.acao} onPress={()=> abrir('pausar', a)} accessibilityRole="button" accessibilityLabel={'Pausar ' + a.title}>
              <Ionicons name="pause" size={14} color={cores.branco}/>
              <Text style={styles.textoacao}>Pausar</Text>
            </TouchableOpacity>
          )}
          {(a.status == 'PAUSADA' || (a.status == 'EXPIRADA' && !passou)) && (
            <TouchableOpacity style={styles.acao} onPress={()=> abrir('reabrir', a)} accessibilityRole="button" accessibilityLabel={'Reabrir ' + a.title}>
              <Ionicons name="play" size={14} color={cores.verde}/>
              <Text style={[styles.textoacao, {color:cores.verde}]}>Reabrir</Text>
            </TouchableOpacity>
          )}
          {a.status == 'EXPIRADA' && passou && (
            <TouchableOpacity style={styles.acao} onPress={()=> criarCopia(a)} accessibilityRole="button" accessibilityLabel={'Criar novo com os dados de ' + a.title}>
              <Ionicons name="copy-outline" size={14} color={cores.verde}/>
              <Text style={[styles.textoacao, {color:cores.verde}]}>Criar novo com estes dados</Text>
            </TouchableOpacity>
          )}
          {podeEditar && (
            <TouchableOpacity style={styles.acao} onPress={()=> abrir('excluir', a)} accessibilityRole="button" accessibilityLabel={'Excluir ' + a.title}>
              <Ionicons name="trash-outline" size={14} color={cores.vermelho}/>
              <Text style={[styles.textoacao, {color:cores.vermelho}]}>Excluir</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  }

  const filtrados = filtro == 'TODOS' ? lista : lista.filter(a => a.status == filtro)

  let textoConfirmar = 'Sim, excluir'
  if(modal && modal.tipo == 'pausar') textoConfirmar = 'Confirmar pausa'
  if(modal && modal.tipo == 'reabrir') textoConfirmar = 'Confirmar reabertura'

  return (
    <View style={styles.container}>
      <View style={styles.topo}>
        <Text style={styles.titulotela}>Meus anúncios</Text>
        <TouchableOpacity style={styles.botaonovo} onPress={novoAnuncio} accessibilityRole="button" accessibilityLabel="Criar anúncio">
          <Ionicons name="add" size={22} color={cores.fundo}/>
        </TouchableOpacity>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTROS.map((s)=>(
            <TouchableOpacity key={s} style={[styles.chip, filtro == s && styles.chipativo]} onPress={()=> setFiltro(s)} accessibilityRole="button" accessibilityLabel={'Filtrar: ' + (s == 'TODOS' ? 'Todos' : NOMES_STATUS[s])} accessibilityState={{selected: filtro == s}}>
              <Text style={[styles.textochip, filtro == s && {color:cores.verde}]}>{s == 'TODOS' ? 'Todos' : NOMES_STATUS[s]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {carregando ? (
        <ActivityIndicator color={cores.verde} style={{marginTop:40}}/>
      ) : erro ? (
        <View style={styles.vazio}>
          <Text style={styles.textovazio} accessibilityLiveRegion="polite">{erro}</Text>
          <TouchableOpacity style={styles.botao} onPress={carregar} accessibilityRole="button">
            <Text style={styles.textobotao}>Tentar de novo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtrados}
          keyExtractor={(item)=> item.id}
          renderItem={({item})=> <Card a={item}/>}
          contentContainerStyle={{padding:24, gap:12}}
          ListEmptyComponent={
            <View style={styles.vazio}>
              <Text style={styles.textovazio}>{filtro == 'TODOS' ? 'Você ainda não tem anúncios.' : 'Nenhum anúncio com esse status.'}</Text>
              {filtro == 'TODOS' && (
                <TouchableOpacity style={styles.botao} onPress={novoAnuncio} accessibilityRole="button">
                  <Text style={styles.textobotao}>Criar anúncio</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      <Modal visible={!!modal} transparent animationType="slide" onRequestClose={fechar}>
        <KeyboardAvoidingView style={styles.fundomodal} behavior={Platform.OS == 'ios' ? 'padding' : undefined}>
          <View style={styles.caixamodal}>

            {modal && modal.tipo == 'pausar' && (
              <>
                <Text style={styles.titulomodal}>Pausar anúncio</Text>
                <Text style={styles.textomodal}>{modal.anuncio.title}</Text>
                <Text style={styles.resumo}>{plural(modal.anuncio.openProposals, 'proposta em aberto', 'propostas em aberto')} · {plural(modal.anuncio.chats, 'conversa', 'conversas')}</Text>
                <Text style={styles.caption}>Quem está negociando vai ser avisado. O anúncio sai da busca e pode ficar pausado até 30 dias; depois disso é encerrado sozinho.</Text>
                <TextInput
                  style={styles.input}
                  value={motivo}
                  onChangeText={setMotivo}
                  placeholder="Motivo da pausa"
                  placeholderTextColor={cores.placeholder}
                  accessibilityLabel="Motivo da pausa"
                />
              </>
            )}

            {modal && modal.tipo == 'reabrir' && (
              <>
                <Text style={styles.titulomodal}>Reabrir anúncio</Text>
                <Text style={styles.textomodal}>Confira o preço e o estado antes de reabrir. O anúncio passa pela moderação automática de novo.</Text>
                <View style={styles.campopreco}>
                  <Text style={styles.caption}>R$</Text>
                  <TextInput style={styles.inputpreco} value={preco} onChangeText={setPreco} keyboardType="decimal-pad" accessibilityLabel="Preço"/>
                </View>
                <View accessibilityRole="radiogroup" accessibilityLabel="Estado de conservação">
                  {ESTADOS.map((e)=>(
                    <TouchableOpacity key={e.valor} style={styles.radio} onPress={()=> setEstado(e.valor)} accessibilityRole="radio" accessibilityLabel={e.texto} accessibilityState={{checked: estado == e.valor}}>
                      <View style={[styles.bolinha, estado == e.valor && {borderColor:cores.verde}]}>
                        {estado == e.valor ? <View style={styles.bolinhadentro}/> : null}
                      </View>
                      <Text style={styles.textomodal}>{e.texto}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {modal && modal.tipo == 'excluir' && (
              <>
                <Text style={styles.titulomodal}>Excluir anúncio?</Text>
                <Text style={styles.textomodal}>{modal.anuncio.title}</Text>
                <Text style={styles.caption}>O anúncio sai do catálogo, mas continua no seu histórico.</Text>
                {modal.anuncio.openProposals > 0 ? (
                  <View style={styles.linha}>
                    <Ionicons name="warning-outline" size={14} color={cores.vermelho}/>
                    <Text style={[styles.caption, {color:cores.vermelho, flex:1}]}>Ele tem {plural(modal.anuncio.openProposals, 'proposta em aberto', 'propostas em aberto')}.</Text>
                  </View>
                ) : null}
              </>
            )}

            {erroModal ? <Text style={styles.erro} accessibilityLiveRegion="polite">{erroModal}</Text> : null}

            <View style={[styles.linha, {gap:10, marginTop:8}]}>
              <TouchableOpacity style={styles.botaosecundario} onPress={fechar} disabled={enviando} accessibilityRole="button">
                <Text style={styles.textobranco}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.botao, {flex:1}, modal && modal.tipo == 'excluir' ? {backgroundColor:cores.vermelho} : null]}
                onPress={confirmar}
                disabled={enviando}
                accessibilityRole="button"
                accessibilityLabel={textoConfirmar}
                accessibilityState={{busy: enviando}}
              >
                {enviando ? <ActivityIndicator color={cores.fundo}/> : <Text style={styles.textobotao}>{textoConfirmar}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container:      {flex:1, backgroundColor:cores.fundo},
  topo:           {flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:24, paddingTop:42},
  titulotela:     {fontFamily:fontes.titulo, fontSize:24, color:cores.branco},
  botaonovo:      {width:44, height:44, borderRadius:12, backgroundColor:cores.verde, alignItems:'center', justifyContent:'center'},
  chips:          {gap:8, paddingHorizontal:24, paddingTop:16},
  chip:           {minHeight:44, paddingHorizontal:14, borderRadius:999, borderWidth:1, borderColor:cores.borda, backgroundColor:cores.campo, justifyContent:'center'},
  chipativo:      {borderColor:cores.verde, backgroundColor:cores.verdeFraco},
  textochip:      {fontFamily:fontes.textoMedio, fontSize:13, color:cores.branco},
  card:           {padding:14, borderRadius:12, borderWidth:1, borderColor:cores.borda, backgroundColor:cores.card, gap:6},
  linha:          {flexDirection:'row', alignItems:'center', gap:4},
  titulo:         {fontFamily:fontes.textoForte, fontSize:15, color:cores.branco},
  status:         {height:22, paddingHorizontal:8, borderRadius:999, justifyContent:'center'},
  textostatus:    {fontFamily:fontes.textoMedio, fontSize:11},
  preco:          {fontFamily:fontes.titulo, fontSize:18, color:cores.verde},
  caption:        {fontFamily:fontes.textoMedio, fontSize:11, lineHeight:15, color:cores.cinza},
  acoes:          {flexDirection:'row', flexWrap:'wrap', gap:8, marginTop:6},
  acao:           {flexDirection:'row', alignItems:'center', gap:6, minHeight:44, paddingHorizontal:12, borderRadius:8, borderWidth:1, borderColor:cores.borda, backgroundColor:cores.campo},
  textoacao:      {fontFamily:fontes.textoForte, fontSize:13, color:cores.branco},
  vazio:          {alignItems:'center', gap:12, marginTop:40, paddingHorizontal:24},
  textovazio:     {fontFamily:fontes.texto, fontSize:14, color:cores.cinza, textAlign:'center'},
  botao:          {height:48, paddingHorizontal:18, borderRadius:12, backgroundColor:cores.verde, alignItems:'center', justifyContent:'center'},
  textobotao:     {fontFamily:fontes.textoForte, fontSize:15, color:cores.fundo},
  botaosecundario:{height:48, paddingHorizontal:18, borderRadius:12, borderWidth:1, borderColor:cores.borda, alignItems:'center', justifyContent:'center'},
  textobranco:    {fontFamily:fontes.textoForte, fontSize:15, color:cores.branco},
  fundomodal:     {flex:1, backgroundColor:cores.fundoModal, justifyContent:'flex-end'},
  caixamodal:     {backgroundColor:cores.card, padding:20, borderTopLeftRadius:18, borderTopRightRadius:18, gap:10},
  titulomodal:    {fontFamily:fontes.titulo, fontSize:18, color:cores.branco},
  textomodal:     {fontFamily:fontes.texto, fontSize:14, color:cores.branco, flex:1},
  resumo:         {fontFamily:fontes.textoForte, fontSize:13, color:cores.verdeEsg},
  input:          {minHeight:49, paddingHorizontal:16, borderRadius:12, borderWidth:1, borderColor:cores.borda, backgroundColor:cores.campo, color:cores.branco, fontFamily:fontes.texto, fontSize:15},
  campopreco:     {flexDirection:'row', alignItems:'center', gap:8, minHeight:49, paddingHorizontal:16, borderRadius:12, borderWidth:1, borderColor:cores.borda, backgroundColor:cores.campo},
  inputpreco:     {flex:1, fontFamily:fontes.titulo, fontSize:18, color:cores.branco},
  radio:          {flexDirection:'row', alignItems:'center', gap:10, minHeight:44},
  bolinha:        {width:18, height:18, borderRadius:9, borderWidth:2, borderColor:cores.cinza, alignItems:'center', justifyContent:'center'},
  bolinhadentro:  {width:8, height:8, borderRadius:4, backgroundColor:cores.verde},
  erro:           {fontFamily:fontes.texto, fontSize:13, color:cores.vermelho},
})
