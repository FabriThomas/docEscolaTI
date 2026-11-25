import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Switch, Modal } from 'react-native'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import Topo from '../../src/Topo'
import { useRascunho, reais, paraCentavos } from '../../src/RascunhoContext'
import { URL_API, cabecalhos, lerResposta } from '../../src/api'
import { cores, fontes } from '../../src/cores'

const ENTREGAS = [
  {valor: 'ENCONTRO', titulo: 'Encontro em ponto seguro', texto: 'Combine pelo chat; confirmação por QR Code.', icone: 'qr-code-outline'},
  {valor: 'RETIRADA', titulo: 'Retirada com o vendedor', texto: 'O comprador busca com você.', icone: 'people-outline'},
]

export default function Preco(){
  const router = useRouter()
  const {anuncio, setAnuncio} = useRascunho()

  const [textoPreco, setTextoPreco] = useState(anuncio.precoCents ? reais(anuncio.precoCents) : '')
  const [textoMinimo, setTextoMinimo] = useState(anuncio.precoMinimoCents ? reais(anuncio.precoMinimoCents) : '')
  const [referencia, setReferencia] = useState<any>(null)
  const [erros, setErros] = useState<any>({})
  const [confirmar, setConfirmar] = useState(false)

  useEffect(()=>{
    let ativo = true
    setReferencia(null)
    if(!anuncio.categoria) return
    async function buscarReferencia(){
      try{
        const res = await fetch(URL_API + '/offers/price-reference?category=' + encodeURIComponent(anuncio.categoria) + '&title=' + encodeURIComponent(anuncio.titulo), {headers: await cabecalhos()})
        const dados = await lerResposta(res)
        if(ativo && res.ok) setReferencia(dados)
      }catch(e){
        if(ativo) setReferencia(null)
      }
    }
    buscarReferencia()
    return ()=>{ ativo = false }
  },[anuncio.categoria])

  let posicao = ''
  if(referencia && anuncio.precoCents){
    posicao = anuncio.precoCents >= referencia.minCents && anuncio.precoCents <= referencia.maxCents ? 'dentro' : 'fora'
  }

  function divergente(){
    if(!referencia || !anuncio.precoCents) return false
    const meio = (referencia.minCents + referencia.maxCents) / 2
    if(meio <= 0) return false
    return Math.abs(anuncio.precoCents - meio) / meio >= 0.5
  }

  function continuar(){
    const e: any = {}
    if(!anuncio.precoCents || anuncio.precoCents <= 0) e.preco = 'Campo obrigatório'
    if(!anuncio.entrega) e.entrega = 'Campo obrigatório'
    if(!anuncio.bairro.trim()) e.bairro = 'Campo obrigatório'
    if(anuncio.aceitaPropostas && textoMinimo.trim() && !anuncio.precoMinimoCents) e.minimo = 'Mínimo inválido'
    if(anuncio.aceitaPropostas && anuncio.precoMinimoCents && anuncio.precoCents && anuncio.precoMinimoCents > anuncio.precoCents) e.minimo = 'O mínimo não pode ser maior que o preço'
    setErros(e)
    if(Object.keys(e).length > 0) return

    if(divergente()){
      setConfirmar(true)
      return
    }
    router.push('/anunciar/revisao')
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <Topo etapa={3} subtitulo="Preço e entrega"/>

        <Text style={[styles.label, {marginTop:18}]}>Preço <Text style={styles.asterisco}>*</Text></Text>
        <View style={[styles.campopreco, erros.preco ? {borderColor:cores.vermelho} : null]}>
          <Text style={styles.rs}>R$</Text>
          <TextInput
            style={styles.inputpreco}
            value={textoPreco}
            onChangeText={(t)=>{ setTextoPreco(t); setAnuncio({...anuncio, precoCents: paraCentavos(t)}) }}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={cores.placeholder}
            accessibilityLabel="Preço"
          />
        </View>
        {erros.preco ? <Text style={styles.erro} accessibilityLiveRegion="polite">{erros.preco}</Text> : null}

        {referencia && (
          <View style={styles.cardreferencia}>
            <View style={styles.linha}>
              <Ionicons name="trending-up" size={16} color={cores.verde}/>
              <Text style={styles.label}>Referência do modelo</Text>
            </View>
            <Text style={styles.faixa}>R$ {reais(referencia.minCents)} – {reais(referencia.maxCents)}</Text>
            {posicao == 'dentro' ? <Text style={styles.textopequeno}>Seu preço está dentro da faixa das últimas negociações.</Text> : null}
            {posicao == 'fora' ? <Text style={styles.textopequeno}>Seu preço está fora da faixa das últimas negociações.</Text> : null}
          </View>
        )}

        <View style={[styles.linha, {justifyContent:'space-between', marginTop:16}]}>
          <View style={{flex:1}}>
            <Text style={styles.label}>Aceitar propostas</Text>
            {anuncio.aceitaPropostas ? (
              <View style={[styles.linha, {marginTop:4}]}>
                <Text style={styles.textopequeno}>Mínimo aceito: R$</Text>
                <TextInput
                  style={styles.inputminimo}
                  value={textoMinimo}
                  onChangeText={(t)=>{ setTextoMinimo(t); setAnuncio({...anuncio, precoMinimoCents: paraCentavos(t)}) }}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={cores.placeholder}
                  accessibilityLabel="Mínimo aceito"
                />
              </View>
            ) : null}
            {erros.minimo ? <Text style={styles.erro} accessibilityLiveRegion="polite">{erros.minimo}</Text> : null}
          </View>
          <Switch
            value={anuncio.aceitaPropostas}
            onValueChange={(v)=>{
              setAnuncio({...anuncio, aceitaPropostas: v, precoMinimoCents: v ? anuncio.precoMinimoCents : null})
              if(!v) setTextoMinimo('')
            }}
            trackColor={{false: cores.borda, true: cores.verde}}
            thumbColor={cores.fundo}
            accessibilityLabel="Aceitar propostas"
          />
        </View>

        <Text style={[styles.label, {marginTop:18}]}>Forma de entrega <Text style={styles.asterisco}>*</Text></Text>
        <View accessibilityRole="radiogroup" style={{gap:8, marginTop:8}}>
          {ENTREGAS.map((e)=>{
            const marcado = anuncio.entrega == e.valor
            return (
              <TouchableOpacity
                key={e.valor}
                style={[styles.opcao, marcado && styles.opcaoativa, erros.entrega ? {borderColor:cores.vermelho} : null]}
                onPress={()=> setAnuncio({...anuncio, entrega: e.valor})}
                accessibilityRole="radio"
                accessibilityLabel={e.titulo + '. ' + e.texto}
                accessibilityState={{checked: marcado}}
              >
                <Ionicons name={e.icone as any} size={18} color={marcado ? cores.verde : cores.cinza}/>
                <View style={{flex:1}}>
                  <Text style={styles.titulo}>{e.titulo}</Text>
                  <Text style={styles.textopequeno}>{e.texto}</Text>
                </View>
                <View style={[styles.bolinha, marcado && {borderColor:cores.verde}]}>
                  {marcado ? <View style={styles.bolinhadentro}/> : null}
                </View>
              </TouchableOpacity>
            )
          })}
        </View>
        {erros.entrega ? <Text style={styles.erro} accessibilityLiveRegion="polite">{erros.entrega}</Text> : null}

        <Text style={[styles.label, {marginTop:18}]}>Localização aproximada <Text style={styles.asterisco}>*</Text></Text>
        <View style={[styles.campo, erros.bairro ? {borderColor:cores.vermelho} : null]}>
          <Ionicons name="location-outline" size={16} color={cores.verde}/>
          <TextInput
            style={styles.inputbairro}
            value={anuncio.bairro}
            onChangeText={(t)=> setAnuncio({...anuncio, bairro: t})}
            placeholder="Zona 7, Maringá – PR"
            placeholderTextColor={cores.placeholder}
            accessibilityLabel="Localização aproximada"
            maxLength={60}
          />
        </View>
        {erros.bairro ? <Text style={styles.erro} accessibilityLiveRegion="polite">{erros.bairro}</Text> : null}
        <View style={[styles.linha, {marginTop:8}]}>
          <Ionicons name="eye-outline" size={14} color={cores.cinza}/>
          <Text style={styles.textodica}>Os compradores veem só o bairro, nunca o seu endereço.</Text>
        </View>

      </ScrollView>

      <View style={styles.rodape}>
        <TouchableOpacity style={styles.botaovoltar} onPress={()=> router.back()} accessibilityRole="button" accessibilityLabel="Voltar">
          <Text style={styles.textovoltar}>Voltar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.botao} onPress={continuar} accessibilityRole="button" accessibilityLabel="Continuar">
          <Text style={styles.textobotao}>Continuar</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={confirmar} transparent animationType="fade" onRequestClose={()=> setConfirmar(false)}>
        <View style={styles.fundomodal}>
          <View style={styles.caixamodal}>
            <Ionicons name="warning-outline" size={24} color={cores.vermelho}/>
            <Text style={styles.titulomodal}>Preço muito diferente da referência</Text>
            <Text style={styles.textopequeno}>O preço está 50% ou mais longe da referência do modelo. Isso tem risco de anúncio fraudulento. Confirma esse preço?</Text>
            <TouchableOpacity style={[styles.botao, {flex:0}]} onPress={()=> setConfirmar(false)} accessibilityRole="button">
              <Text style={styles.textobotao}>Corrigir preço</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botaosecundario} onPress={()=>{ setConfirmar(false); router.push('/anunciar/revisao') }} accessibilityRole="button">
              <Text style={styles.textovoltar}>Manter preço</Text>
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
  label:          {fontFamily:fontes.textoForte, fontSize:13, color:cores.branco},
  asterisco:      {color:cores.vermelho},
  campopreco:     {flexDirection:'row', alignItems:'center', gap:8, height:56, marginTop:8, paddingHorizontal:14, borderRadius:12, borderWidth:1, borderColor:cores.borda, backgroundColor:cores.campo},
  rs:             {fontFamily:fontes.tituloMedio, fontSize:18, color:cores.cinza},
  inputpreco:     {flex:1, fontFamily:fontes.titulo, fontSize:24, color:cores.branco},
  erro:           {fontFamily:fontes.texto, fontSize:13, color:cores.vermelho, marginTop:6},
  cardreferencia: {padding:14, borderRadius:12, backgroundColor:cores.verdeMedio, marginTop:12, gap:4},
  linha:          {flexDirection:'row', alignItems:'center', gap:6},
  faixa:          {fontFamily:fontes.titulo, fontSize:18, color:cores.branco},
  textopequeno:   {fontFamily:fontes.texto, fontSize:13, lineHeight:18, color:cores.cinza},
  inputminimo:    {minWidth:80, height:32, paddingHorizontal:8, borderRadius:8, borderWidth:1, borderColor:cores.borda, color:cores.branco, fontFamily:fontes.textoForte, fontSize:13},
  opcao:          {flexDirection:'row', alignItems:'center', gap:12, padding:14, minHeight:48, borderRadius:12, borderWidth:1, borderColor:cores.borda, backgroundColor:cores.campo},
  opcaoativa:     {borderColor:cores.verde, backgroundColor:cores.verdeFraco},
  titulo:         {fontFamily:fontes.textoForte, fontSize:14, color:cores.branco},
  bolinha:        {width:18, height:18, borderRadius:9, borderWidth:1.5, borderColor:cores.cinza, alignItems:'center', justifyContent:'center'},
  bolinhadentro:  {width:8, height:8, borderRadius:4, backgroundColor:cores.verde},
  campo:          {flexDirection:'row', alignItems:'center', gap:8, height:48, marginTop:8, paddingHorizontal:14, borderRadius:12, borderWidth:1, borderColor:cores.borda, backgroundColor:cores.campo},
  inputbairro:    {flex:1, fontFamily:fontes.texto, fontSize:15, color:cores.branco},
  textodica:      {flex:1, fontFamily:fontes.textoMedio, fontSize:11, color:cores.cinza},
  rodape:         {flexDirection:'row', paddingTop:14, paddingHorizontal:24, paddingBottom:26, borderTopWidth:1, borderColor:cores.borda, backgroundColor:cores.fundo},
  botaovoltar:    {height:48, paddingHorizontal:18, borderRadius:12, borderWidth:1, borderColor:cores.borda, backgroundColor:cores.campo, justifyContent:'center', marginRight:12},
  textovoltar:    {fontFamily:fontes.textoForte, fontSize:15, color:cores.branco},
  botao:          {flex:1, height:48, borderRadius:12, backgroundColor:cores.verde, alignItems:'center', justifyContent:'center'},
  botaosecundario:{height:48, borderRadius:12, borderWidth:1, borderColor:cores.borda, alignItems:'center', justifyContent:'center'},
  textobotao:     {fontFamily:fontes.textoForte, fontSize:15, color:cores.fundo},
  fundomodal:     {flex:1, backgroundColor:cores.fundoModal, justifyContent:'center', padding:24},
  caixamodal:     {backgroundColor:cores.card, padding:20, borderRadius:18, gap:10},
  titulomodal:    {fontFamily:fontes.titulo, fontSize:18, color:cores.branco},
})
