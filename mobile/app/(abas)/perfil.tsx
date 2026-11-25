import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Modal, ActivityIndicator } from 'react-native'
import { useState, useCallback } from 'react'
import { useRouter, useFocusEffect } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { chamar, lerResposta } from '../../src/api'
import { useSessao } from '../../src/SessaoContext'
import { cores, fontes } from '../../src/cores'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const CRITERIOS: any = {
  communication: 'Comunicação',
  punctuality: 'Pontualidade',
  listingAccuracy: 'Fidelidade do anúncio',
}

const SELOS: any = {
  recycler: 'Reciclador',
  donor: 'Doador',
}

function desde(data?: string){
  if(!data) return ''
  const d = new Date(data)
  if(isNaN(d.getTime())) return ''
  return 'desde ' + MESES[d.getUTCMonth()] + '/' + d.getUTCFullYear()
}

function virgula(n: number, casas = 1){
  return Number(n || 0).toFixed(casas).replace('.', ',')
}

function plural(n: number, um: string, varios: string){
  return n == 1 ? '1 ' + um : n + ' ' + varios
}

export default function Perfil(){
  const router = useRouter()
  const {sair} = useSessao()

  const [perfil, setPerfil] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [confirmarSaida, setConfirmarSaida] = useState(false)
  const [saindo, setSaindo] = useState(false)

  async function carregar(){
    setErro('')
    try{
      const res = await chamar('/me/profile')
      const dados = await lerResposta(res)
      if(res.ok) setPerfil(dados)
      else if(res.status != 401) setErro(dados.detail || 'Não deu pra carregar seu perfil.')
    }catch(e){
      setErro('Sem conexão. Confira a internet.')
    }
    setCarregando(false)
  }

  useFocusEffect(useCallback(()=>{
    carregar()
  },[]))

  function emBreve(){
    alert('Isso ainda não está pronto no app.')
  }

  async function confirmarSair(){
    setSaindo(true)
    try{
      await sair()
      setConfirmarSaida(false)
      router.replace('/login')
    }catch(e){
      alert('erro ao sair da conta, tente de novo')
    }
    setSaindo(false)
  }

  if(carregando && !perfil){
    return (
      <View style={[styles.tela, styles.centro]}>
        <ActivityIndicator color={cores.verde}/>
      </View>
    )
  }

  if(!perfil){
    return (
      <View style={[styles.tela, styles.centro]}>
        <Ionicons name="cloud-offline-outline" size={36} color={cores.cinza}/>
        <Text style={styles.textoerro}>{erro || 'Não deu pra carregar seu perfil.'}</Text>
        <TouchableOpacity style={styles.botaotentar} onPress={()=>{ setCarregando(true); carregar() }} accessibilityRole="button">
          <Text style={styles.textotentar}>Tentar de novo</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const rep = perfil.reputation || {}
  const esg = perfil.esg || {}
  const anuncios = perfil.listings || {}
  const selos = (esg.badges || []).filter((b: any)=> SELOS[b.kind])
  const estrelas = Math.round(rep.average || 0)

  const verificacoes = []
  if(perfil.emailVerified) verificacoes.push('E-mail verificado')
  if(perfil.twoFactorEnabled) verificacoes.push('2FA ativo')

  const menu = [
    {icone: 'pricetags-outline', titulo: 'Meus anúncios', texto: plural(anuncios.active || 0, 'ativo', 'ativos') + ' · ' + plural(anuncios.paused || 0, 'pausado', 'pausados'), tile: styles.tileneutro, cor: cores.branco, ir: ()=> router.push('/anuncios')},
    {icone: 'logo-bitcoin', titulo: 'Carteira', texto: (perfil.coins || 0) + ' moedas disponíveis', tile: styles.tileneutro, cor: cores.branco, ir: emBreve},
    {icone: 'leaf-outline', titulo: 'Meu impacto ESG', texto: 'Ver dashboard e certificado', tile: styles.tileesg, cor: cores.verdeEsg, ir: emBreve},
    {icone: 'shield-outline', titulo: 'Segurança da conta', texto: 'Senha, 2FA e sessões', tile: styles.tileneutro, cor: cores.branco, ir: ()=> router.push('/perfil/seguranca')},
  ]

  return (
    <View style={styles.tela}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <View style={styles.topo}>
          <Text style={styles.titulo}>Perfil</Text>
          <TouchableOpacity style={styles.botaoicone} onPress={()=> router.push('/perfil/editar')} accessibilityRole="button" accessibilityLabel="Editar perfil" hitSlop={8}>
            <Ionicons name="pencil" size={15} color={cores.branco}/>
          </TouchableOpacity>
        </View>

        <View style={styles.cabecalho}>
          {perfil.avatarUrl
            ? <Image source={{uri: perfil.avatarUrl}} style={styles.avatar} accessibilityLabel="Sua foto"/>
            : <View style={styles.avatar}><Ionicons name="person-outline" size={30} color={cores.branco}/></View>}
          <View style={{flex:1, marginLeft:14}}>
            <Text style={styles.nome}>{perfil.displayName}</Text>
            <View style={styles.linhalocal}>
              <Ionicons name="location-outline" size={11} color={cores.cinza}/>
              <Text style={[styles.cinza, {marginTop:0, marginLeft:3}]}>{[perfil.region, desde(perfil.memberSince)].filter(t => t).join(' · ')}</Text>
            </View>
            {verificacoes.length > 0 &&
              <View style={styles.linhaverificado}>
                <Ionicons name="shield-checkmark-outline" size={12} color={cores.verde}/>
                <Text style={styles.verificado}>{verificacoes.join(' · ')}</Text>
              </View>}
          </View>
        </View>

        <View style={styles.card}>
          <View style={{flexDirection:'row', alignItems:'center'}}>
            <Text style={styles.nota}>{virgula(rep.average)}</Text>
            <View style={{marginLeft:12}}>
              <View style={{flexDirection:'row'}} accessible accessibilityLabel={'Nota ' + virgula(rep.average) + ' de 5'}>
                {[1,2,3,4,5].map(n => (
                  <Ionicons key={n} name={n <= estrelas ? 'star' : 'star-outline'} size={14} color={cores.verde} style={{marginRight:2}}/>
                ))}
              </View>
              <Text style={[styles.cinza, {marginTop:4}]}>{plural(rep.reviews || 0, 'avaliação', 'avaliações')} · {plural(rep.deals || 0, 'negociação', 'negociações')}</Text>
            </View>
          </View>

          {(rep.criteria || []).map((c: any)=> (
            <View key={c.key} style={{marginTop:12}}>
              <View style={styles.linhacriterio}>
                <Text style={[styles.cinza, {marginTop:0}]}>{CRITERIOS[c.key] || c.key}</Text>
                <Text style={styles.criterio}>{virgula(c.average)}</Text>
              </View>
              <View style={styles.trilho}>
                <View style={[styles.preenchido, {width: Math.min(100, (c.average / 5) * 100) + '%'}]}/>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.grupo}>Selos ESG</Text>
        <View style={styles.chips}>
          {selos.map((s: any)=> (
            <View key={s.id} style={styles.chip}>
              <Ionicons name={s.kind == 'recycler' ? 'reload-outline' : 'heart-outline'} size={12} color={cores.verdeEsg}/>
              <Text style={styles.textochip}>{SELOS[s.kind]}</Text>
            </View>
          ))}
          <View style={[styles.chip, styles.chipesg]}>
            <Ionicons name="leaf-outline" size={12} color={cores.verdeEsg}/>
            <Text style={styles.textochip}>{virgula(esg.kgAvoided)} kg evitados</Text>
          </View>
        </View>

        <View style={[styles.card, {paddingVertical:4, paddingHorizontal:0, marginTop:20}]}>
          {menu.map((m, i)=> (
            <TouchableOpacity key={m.titulo} style={[styles.item, i > 0 && styles.itemborda]} onPress={m.ir} accessibilityRole="button" accessibilityLabel={m.titulo}>
              <View style={[styles.tile, m.tile]}>
                <Ionicons name={m.icone as any} size={17} color={m.cor}/>
              </View>
              <View style={{flex:1, marginLeft:12}}>
                <Text style={styles.tituloitem}>{m.titulo}</Text>
                <Text style={[styles.cinza, {marginTop:1}]}>{m.texto}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={cores.cinza}/>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.sair} onPress={()=> setConfirmarSaida(true)} accessibilityRole="button" accessibilityLabel="Sair da conta">
          <Ionicons name="log-out-outline" size={17} color={cores.vermelho}/>
          <Text style={styles.textosair}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={confirmarSaida} transparent animationType="fade" onRequestClose={()=> setConfirmarSaida(false)}>
        <View style={styles.fundomodal}>
          <View style={styles.modal}>
            <Text style={styles.titulomodal}>Sair da conta?</Text>
            <Text style={[styles.cinza, {marginTop:8, lineHeight:19}]}>Os dados guardados neste aparelho serão apagados. Pra voltar, é só entrar de novo.</Text>
            <View style={{flexDirection:'row', marginTop:20}}>
              <TouchableOpacity style={styles.botaosecundario} onPress={()=> setConfirmarSaida(false)} accessibilityRole="button" accessibilityLabel="Cancelar">
                <Text style={styles.textosecundario}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botaovermelho} onPress={confirmarSair} disabled={saindo} accessibilityRole="button" accessibilityLabel="Sair">
                {saindo ? <ActivityIndicator color={cores.branco}/> : <Text style={styles.textovermelho}>Sair</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  tela:         {flex:1, backgroundColor:cores.fundo},
  centro:       {alignItems:'center', justifyContent:'center', paddingHorizontal:32},
  conteudo:     {paddingHorizontal:20, paddingTop:56, paddingBottom:32},
  topo:         {flexDirection:'row', alignItems:'center', justifyContent:'space-between'},
  titulo:       {fontFamily:fontes.titulo, fontSize:24, color:cores.branco},
  botaoicone:   {width:32, height:32, borderWidth:1, borderColor:cores.borda, borderRadius:8, alignItems:'center', justifyContent:'center'},
  cabecalho:    {flexDirection:'row', alignItems:'center', marginTop:20},
  avatar:       {width:64, height:64, borderRadius:32, borderWidth:2, borderColor:'rgba(29,219,106,0.6)', backgroundColor:cores.borda, alignItems:'center', justifyContent:'center'},
  nome:         {fontFamily:fontes.titulo, fontSize:18, color:cores.branco},
  cinza:        {fontFamily:fontes.textoMedio, fontSize:11, color:cores.cinza, marginTop:2},
  linhalocal:   {flexDirection:'row', alignItems:'center', marginTop:3},
  linhaverificado: {flexDirection:'row', alignItems:'center', marginTop:6},
  verificado:   {fontFamily:fontes.textoMedio, fontSize:11, color:cores.verde, marginLeft:4},
  card:         {backgroundColor:cores.card, borderWidth:1, borderColor:cores.borda, borderRadius:12, padding:16, marginTop:20},
  nota:         {fontFamily:fontes.titulo, fontSize:24, color:cores.branco},
  linhacriterio:{flexDirection:'row', justifyContent:'space-between'},
  criterio:     {fontFamily:fontes.textoForte, fontSize:13, color:cores.branco},
  trilho:       {height:6, borderRadius:999, backgroundColor:cores.borda, marginTop:6, overflow:'hidden'},
  preenchido:   {height:6, borderRadius:999, backgroundColor:cores.verde},
  grupo:        {fontFamily:fontes.textoForte, fontSize:13, color:cores.branco, marginTop:24},
  chips:        {flexDirection:'row', flexWrap:'wrap', marginTop:10},
  chip:         {flexDirection:'row', alignItems:'center', backgroundColor:'rgba(168,239,196,0.14)', borderRadius:999, paddingHorizontal:10, paddingVertical:5, marginRight:8, marginBottom:8},
  chipesg:      {backgroundColor:'rgba(168,239,196,0.14)'},
  textochip:    {fontFamily:fontes.textoMedio, fontSize:11, color:cores.verdeEsg, marginLeft:5},
  item:         {flexDirection:'row', alignItems:'center', paddingVertical:11, paddingHorizontal:14},
  itemborda:    {borderTopWidth:1, borderTopColor:cores.borda},
  tile:         {width:34, height:34, borderRadius:8, alignItems:'center', justifyContent:'center'},
  tileverde:    {backgroundColor:cores.verdeForte},
  tileesg:      {backgroundColor:'rgba(168,239,196,0.12)'},
  tileneutro:   {backgroundColor:cores.cinzaFraco},
  tituloitem:   {fontFamily:fontes.textoForte, fontSize:13, color:cores.branco},
  sair:         {flexDirection:'row', alignItems:'center', justifyContent:'center', marginTop:24, paddingVertical:12},
  textosair:    {fontFamily:fontes.textoForte, fontSize:14, color:cores.vermelho, marginLeft:8},
  textoerro:    {fontFamily:fontes.texto, fontSize:14, color:cores.cinza, textAlign:'center', marginTop:12},
  botaotentar:  {borderWidth:1, borderColor:cores.borda, borderRadius:10, paddingHorizontal:18, height:44, justifyContent:'center', marginTop:16},
  textotentar:  {fontFamily:fontes.textoMedio, fontSize:14, color:cores.branco},
  fundomodal:   {flex:1, backgroundColor:cores.fundoModal, justifyContent:'center', paddingHorizontal:24},
  modal:        {backgroundColor:cores.card, borderWidth:1, borderColor:cores.borda, borderRadius:14, padding:20},
  titulomodal:  {fontFamily:fontes.titulo, fontSize:18, color:cores.branco},
  botaosecundario: {flex:1, height:46, borderRadius:10, borderWidth:1, borderColor:cores.borda, alignItems:'center', justifyContent:'center', marginRight:8},
  textosecundario: {fontFamily:fontes.textoMedio, fontSize:14, color:cores.branco},
  botaovermelho:{flex:1, height:46, borderRadius:10, backgroundColor:cores.vermelho, alignItems:'center', justifyContent:'center', marginLeft:8},
  textovermelho:{fontFamily:fontes.textoForte, fontSize:14, color:cores.branco},
})
