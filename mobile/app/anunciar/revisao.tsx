import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import Topo from '../../src/Topo'
import { useRascunho, rascunhoVazio, reais, ESTADOS } from '../../src/RascunhoContext'
import { URL_API, cabecalhos, lerResposta } from '../../src/api'
import { cores, fontes } from '../../src/cores'

const NOME_ENTREGA: any = {
  ENCONTRO: 'Encontro em ponto seguro',
  RETIRADA: 'Retirada com o vendedor',
}

export default function Revisao(){
  const router = useRouter()
  const {anuncio, setAnuncio} = useRascunho()

  const [publicando, setPublicando] = useState(false)
  const [erro, setErro] = useState<any>(null)

  const estado = ESTADOS.find(e => e.valor == anuncio.estado)
  const capa = anuncio.fotos[0]
  const pedeDados = anuncio.categoria == 'Armazenamento' || anuncio.tipoOferta == 'MAQUINA'

  let textoPropostas = 'Não aceita propostas'
  if(anuncio.aceitaPropostas) textoPropostas = anuncio.precoMinimoCents ? 'Aceita a partir de R$ ' + reais(anuncio.precoMinimoCents) : 'Aceita propostas'

  async function enviarFoto(f: any){
    const form = new FormData()
    form.append('file', {uri: f.uri, name: f.id + '.webp', type: 'image/webp'} as any)
    const res = await fetch(URL_API + '/media', {method: 'POST', headers: await cabecalhos(false), body: form})
    const dados = await lerResposta(res)
    if(!res.ok) throw {code: dados.code || 'ERRO_UPLOAD', message: dados.detail || 'erro ao enviar a foto, tente de novo'}
    return dados.mediaId
  }

  async function publicar(){
    if(publicando) return
    setErro(null)
    if(!anuncio.titulo || !anuncio.categoria || !anuncio.tempoUso || !anuncio.estado || !anuncio.precoCents || !anuncio.entrega || !anuncio.bairro || anuncio.fotos.length == 0 || anuncio.materialPerigoso){
      setErro({code: 'RASCUNHO_VAZIO', mensagem: 'Faltam dados do anúncio. Volte e preencha as etapas.'})
      return
    }
    setPublicando(true)
    try{
      const mediaIds = []
      for(const f of anuncio.fotos) mediaIds.push(await enviarFoto(f))
      const defectMediaIds = []
      for(const f of anuncio.fotosDefeito) defectMediaIds.push(await enviarFoto(f))

      const res = await fetch(URL_API + '/offers', {
        method: 'POST',
        headers: await cabecalhos(),
        body: JSON.stringify({
          title: anuncio.titulo,
          category: anuncio.categoria,
          usageTime: anuncio.tempoUso,
          operationalState: anuncio.estado,
          specs: anuncio.especificacoes,
          description: anuncio.descricao,
          offerType: anuncio.tipoOferta,
          model: anuncio.modelo,
          serialNumber: anuncio.numeroSerie,
          dataStatus: pedeDados ? anuncio.situacaoDados : null,
          hazardousMaterial: anuncio.materialPerigoso,
          priceCents: anuncio.precoCents,
          allowsProposals: anuncio.aceitaPropostas,
          minPriceCents: anuncio.aceitaPropostas ? anuncio.precoMinimoCents : null,
          deliveryMethod: anuncio.entrega,
          neighborhood: anuncio.bairro,
          mediaIds: mediaIds,
          defectMediaIds: defectMediaIds,
          fieldOrigin: anuncio.origem,
          usedScanner: !!anuncio.scanner,
          sellerDeclarationAccepted: anuncio.aceite,
        })
      })
      const dados = await lerResposta(res)
      if(!res.ok){
        setErro({code: dados.code || 'ERRO', mensagem: dados.detail || 'erro ao publicar o anuncio'})
        setPublicando(false)
        return
      }

      setAnuncio(rascunhoVazio)
      setPublicando(false)
      alert('Anúncio publicado! Ele passa pela moderação automática antes de aparecer.')
      if(router.canDismiss()) router.dismissAll()
      router.replace('/anuncios')
    }catch(e: any){
      setPublicando(false)
      if(e && e.code) setErro({code: e.code, mensagem: e.message})
      else setErro({code: 'SEM_CONEXAO', mensagem: 'Sem conexão. Seu anúncio continua salvo aqui, tente de novo.'})
    }
  }

  function LinhaResumo({icone, titulo, valor, rota, nome}: {icone: any, titulo: string, valor: string, rota: any, nome: string}){
    return (
      <>
        <View style={styles.divisor}/>
        <View style={styles.linharesumo}>
          <Ionicons name={icone} size={16} color={cores.cinza}/>
          <View style={{flex:1}}>
            <Text style={styles.caption}>{titulo}</Text>
            <Text style={styles.valor}>{valor}</Text>
          </View>
          <TouchableOpacity style={styles.editar} onPress={()=> router.push(rota)} accessibilityRole="button" accessibilityLabel={'Editar ' + nome}>
            <Ionicons name="create-outline" size={13} color={cores.verde}/>
            <Text style={styles.textoeditar}>Editar</Text>
          </TouchableOpacity>
        </View>
      </>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <Topo etapa={4} subtitulo="Revise e publique"/>

        <View style={styles.cartao}>
          <View style={styles.capa}>
            {capa ? <Image source={{uri: capa.uri}} style={styles.imagemcapa} accessibilityLabel="Foto de capa"/> : null}
            <View style={styles.badgefotos}>
              <Ionicons name="images-outline" size={12} color={cores.branco}/>
              <Text style={styles.textobadge}>{anuncio.fotos.length == 1 ? '1 foto' : anuncio.fotos.length + ' fotos'}</Text>
            </View>
          </View>
          <View style={styles.corpo}>
            <Text style={styles.tituloanuncio}>{anuncio.titulo}</Text>
            <Text style={styles.caption}>{estado ? estado.texto : ''}</Text>
            <View style={styles.tagreuso}>
              <Ionicons name="leaf-outline" size={11} color={cores.verdeEsg}/>
              <Text style={styles.textoreuso}>Reuso</Text>
            </View>
            <View style={styles.linhapreco}>
              <Text style={styles.preco}>{anuncio.precoCents ? 'R$ ' + reais(anuncio.precoCents) : ''}</Text>
              <View style={styles.linha}>
                <Ionicons name="location-outline" size={12} color={cores.cinza}/>
                <Text style={styles.caption}>{anuncio.bairro}</Text>
              </View>
            </View>

            <LinhaResumo icone="pricetag-outline" titulo="Categoria e estado" valor={anuncio.categoria + ' · ' + anuncio.tempoUso + ' de uso'} rota="/anunciar/detalhes" nome="categoria e estado"/>
            <LinhaResumo icone="people-outline" titulo="Propostas" valor={textoPropostas} rota="/anunciar/preco" nome="propostas"/>
            <LinhaResumo icone="qr-code-outline" titulo="Entrega" valor={NOME_ENTREGA[anuncio.entrega] || ''} rota="/anunciar/preco" nome="entrega"/>
          </View>
        </View>

        {anuncio.ganhaMoedas ? (
          <View style={styles.caixaesg}>
            <Ionicons name="cash-outline" size={18} color={cores.verdeEsg}/>
            <Text style={styles.textoesg}>Você ganha moedas pelo Scanner IA.</Text>
          </View>
        ) : null}

        <TouchableOpacity style={styles.check} onPress={()=> setAnuncio({...anuncio, aceite: !anuncio.aceite})} accessibilityRole="checkbox" accessibilityState={{checked: anuncio.aceite}} accessibilityLabel="Declaro que o item é meu e as informações são verdadeiras. Haverá moderação automática.">
          <View style={[styles.quadrado, anuncio.aceite && styles.quadradoativo]}>
            {anuncio.aceite ? <Ionicons name="checkmark" size={14} color={cores.fundo}/> : null}
          </View>
          <Text style={styles.textocheck}>Declaro que o item é meu e as informações são verdadeiras. Haverá moderação automática.</Text>
        </TouchableOpacity>

        {erro && erro.code == 'OFFER_LIMIT_REACHED' ? (
          <View style={styles.caixaerro} accessibilityLiveRegion="polite">
            <View style={styles.linha}>
              <Ionicons name="warning-outline" size={16} color={cores.vermelho}/>
              <Text style={styles.tituloerro}>Limite de anúncios atingido</Text>
            </View>
            <Text style={styles.textoerro}>{erro.mensagem}</Text>
            <TouchableOpacity style={styles.botaoerro} onPress={()=> router.push('/anuncios')} accessibilityRole="button">
              <Text style={styles.textobotaoerro}>Encerrar um anúncio</Text>
            </TouchableOpacity>
          </View>
        ) : erro && erro.code == 'PII_OR_CONTACT_DETECTED' ? (
          <View style={styles.caixaerro} accessibilityLiveRegion="polite">
            <View style={styles.linha}>
              <Ionicons name="warning-outline" size={16} color={cores.vermelho}/>
              <Text style={styles.tituloerro}>Dados pessoais na descrição</Text>
            </View>
            <Text style={styles.textoerro}>{erro.mensagem}</Text>
            <TouchableOpacity style={styles.botaoerro} onPress={()=> router.push('/anunciar/detalhes')} accessibilityRole="button">
              <Text style={styles.textobotaoerro}>Editar descrição</Text>
            </TouchableOpacity>
          </View>
        ) : erro ? (
          <Text style={styles.erro} accessibilityLiveRegion="polite">{erro.mensagem}</Text>
        ) : null}

      </ScrollView>

      <View style={styles.rodape}>
        <TouchableOpacity style={styles.botaovoltar} onPress={()=> router.back()} accessibilityRole="button" accessibilityLabel="Voltar">
          <Text style={styles.textovoltar}>Voltar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.botao, (!anuncio.aceite || publicando) && {opacity:0.5}]}
          onPress={publicar}
          disabled={!anuncio.aceite || publicando}
          accessibilityRole="button"
          accessibilityLabel="Publicar anúncio"
          accessibilityState={{disabled: !anuncio.aceite || publicando, busy: publicando}}
        >
          {publicando ? <ActivityIndicator color={cores.fundo}/> : <Text style={styles.textobotao}>Publicar anúncio</Text>}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container:     {flex:1, backgroundColor:cores.fundo},
  conteudo:      {paddingHorizontal:24, paddingTop:42, paddingBottom:24},
  cartao:        {marginTop:18, borderRadius:18, borderWidth:1, borderColor:cores.borda, backgroundColor:cores.card, overflow:'hidden'},
  capa:          {height:160, backgroundColor:cores.fundoEscuro},
  imagemcapa:    {width:'100%', height:'100%'},
  badgefotos:    {position:'absolute', right:10, bottom:10, flexDirection:'row', alignItems:'center', gap:4, paddingHorizontal:8, height:22, borderRadius:999, backgroundColor:cores.fundoFoto},
  textobadge:    {fontFamily:fontes.textoMedio, fontSize:11, color:cores.branco},
  corpo:         {padding:14},
  tituloanuncio: {fontFamily:fontes.tituloMedio, fontSize:16, color:cores.branco},
  caption:       {fontFamily:fontes.texto, fontSize:13, color:cores.cinza},
  tagreuso:      {flexDirection:'row', alignItems:'center', gap:4, alignSelf:'flex-start', marginTop:6, paddingHorizontal:8, height:20, borderRadius:999, backgroundColor:'rgba(168,239,196,0.08)'},
  textoreuso:    {fontFamily:fontes.textoMedio, fontSize:11, color:cores.verdeEsg},
  linhapreco:    {flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop:8},
  preco:         {fontFamily:fontes.titulo, fontSize:20, color:cores.verde},
  linha:         {flexDirection:'row', alignItems:'center', gap:4},
  divisor:       {height:1, backgroundColor:cores.borda, marginVertical:12},
  linharesumo:   {flexDirection:'row', alignItems:'center', gap:10},
  valor:         {fontFamily:fontes.textoForte, fontSize:14, color:cores.branco},
  editar:        {flexDirection:'row', alignItems:'center', gap:4, minHeight:44, paddingHorizontal:8},
  textoeditar:   {fontFamily:fontes.textoForte, fontSize:13, color:cores.verde},
  caixaesg:      {flexDirection:'row', alignItems:'center', gap:10, padding:12, borderRadius:12, backgroundColor:'rgba(168,239,196,0.08)', marginTop:14},
  textoesg:      {flex:1, fontFamily:fontes.texto, fontSize:13, color:cores.branco},
  check:         {flexDirection:'row', alignItems:'center', gap:10, marginTop:18},
  quadrado:      {width:20, height:20, borderRadius:6, borderWidth:1.5, borderColor:cores.cinza, alignItems:'center', justifyContent:'center'},
  quadradoativo: {backgroundColor:cores.verde, borderColor:cores.verde},
  textocheck:    {flex:1, fontFamily:fontes.texto, fontSize:13, color:cores.branco},
  caixaerro:     {padding:12, borderRadius:12, backgroundColor:cores.vermelhoFraco, marginTop:14, gap:6},
  tituloerro:    {fontFamily:fontes.textoForte, fontSize:14, color:cores.branco},
  textoerro:     {fontFamily:fontes.texto, fontSize:13, color:cores.branco},
  botaoerro:     {alignSelf:'flex-start', minHeight:44, justifyContent:'center'},
  textobotaoerro:{fontFamily:fontes.textoForte, fontSize:13, color:cores.vermelho},
  erro:          {fontFamily:fontes.texto, fontSize:13, color:cores.vermelho, marginTop:12},
  rodape:        {flexDirection:'row', paddingTop:14, paddingHorizontal:24, paddingBottom:26, borderTopWidth:1, borderColor:cores.borda, backgroundColor:cores.fundo},
  botaovoltar:   {height:48, paddingHorizontal:18, borderRadius:12, borderWidth:1, borderColor:cores.borda, backgroundColor:cores.campo, justifyContent:'center', marginRight:12},
  textovoltar:   {fontFamily:fontes.textoForte, fontSize:15, color:cores.branco},
  botao:         {flex:1, height:48, borderRadius:12, backgroundColor:cores.verde, alignItems:'center', justifyContent:'center'},
  textobotao:    {fontFamily:fontes.textoForte, fontSize:15, color:cores.fundo},
})
