import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { useState, useEffect } from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { reais, paraCentavos, ESTADOS } from '../../src/RascunhoContext'
import { URL_API, cabecalhos, lerResposta } from '../../src/api'
import { cores, fontes } from '../../src/cores'

export default function EditarAnuncio(){
  const router = useRouter()
  const params = useLocalSearchParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const idValido = !!id && /^[A-Za-z0-9-]+$/.test(id)

  const [carregando, setCarregando] = useState(true)
  const [erroCarregar, setErroCarregar] = useState('')

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [preco, setPreco] = useState('')
  const [estado, setEstado] = useState('')
  const [status, setStatus] = useState('')
  const [versao, setVersao] = useState(1)

  const [erros, setErros] = useState<any>({})
  const [erroApi, setErroApi] = useState('')
  const [conflito, setConflito] = useState(false)
  const [salvando, setSalvando] = useState(false)

  async function carregar(){
    if(!idValido){
      setErroCarregar('Anúncio não encontrado')
      setCarregando(false)
      return
    }
    setCarregando(true)
    setErroCarregar('')
    try{
      const res = await fetch(URL_API + '/offers/' + id, {headers: await cabecalhos()})
      const a = await lerResposta(res)
      if(!res.ok){
        setErroCarregar(a.detail || 'erro ao carregar o anuncio')
      }else{
        setTitulo(a.title || '')
        setDescricao(a.description || '')
        setPreco(reais(a.priceCents || 0))
        setEstado(a.operationalState || '')
        setStatus(a.status)
        setVersao(a.version || 1)
      }
    }catch(e){
      setErroCarregar('Sem conexão. Confira a internet.')
    }
    setCarregando(false)
  }

  useEffect(()=>{
    carregar()
  },[id])

  async function salvar(){
    if(salvando) return
    setErroApi('')
    setConflito(false)

    const novos: any = {}
    if(!titulo.trim()) novos.titulo = 'Campo obrigatório'
    const cents = paraCentavos(preco)
    if(!cents) novos.preco = 'Campo obrigatório'
    if(!estado) novos.estado = 'Campo obrigatório'
    setErros(novos)
    if(Object.keys(novos).length > 0) return

    setSalvando(true)
    try{
      const res = await fetch(URL_API + '/offers/' + id, {
        method: 'PATCH',
        headers: await cabecalhos(),
        body: JSON.stringify({
          title: titulo.trim(),
          description: descricao.trim(),
          priceCents: cents,
          operationalState: estado,
          version: versao,
        })
      })
      const dados = await lerResposta(res)
      setSalvando(false)
      if(res.ok){
        alert('Alterações salvas.')
        router.back()
        return
      }
      if(dados.code == 'OFFER_VERSION_CONFLICT') setConflito(true)
      else setErroApi(dados.detail || 'erro ao salvar')
    }catch(e){
      setSalvando(false)
      setErroApi('Sem conexão. Suas alterações continuam aqui, tente de novo.')
    }
  }

  async function verVersaoAtual(){
    setConflito(false)
    setErros({})
    await carregar()
  }

  if(carregando){
    return <View style={styles.container}><ActivityIndicator color={cores.verde} style={{marginTop:80}}/></View>
  }

  if(erroCarregar){
    return (
      <View style={[styles.container, {padding:24, paddingTop:80, gap:12}]}>
        <Text style={styles.textobranco} accessibilityLiveRegion="polite">{erroCarregar}</Text>
        {idValido && erroCarregar != 'Anúncio não encontrado' ? (
          <TouchableOpacity style={styles.botao} onPress={carregar} accessibilityRole="button">
            <Text style={styles.textobotao}>Tentar de novo</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.botaosecundario} onPress={()=> router.back()} accessibilityRole="button">
          <Text style={styles.textobotaosecundario}>Voltar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS == 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{padding:24, paddingTop:42, gap:16}} keyboardShouldPersistTaps="handled">
        <Text style={styles.titulotela}>Editar anúncio</Text>

        {status == 'ATIVA' ? (
          <View style={styles.aviso}>
            <Text style={styles.textoaviso}>Ao salvar, o anúncio passa pela moderação automática de novo antes de voltar para a busca.</Text>
          </View>
        ) : null}

        {conflito ? (
          <View style={styles.caixaerro} accessibilityLiveRegion="polite">
            <View style={styles.linha}>
              <Ionicons name="warning-outline" size={16} color={cores.vermelho}/>
              <Text style={[styles.textobranco, {flex:1}]}>Alguém alterou esse anúncio enquanto você editava.</Text>
            </View>
            <TouchableOpacity style={styles.botaosecundario} onPress={verVersaoAtual} accessibilityRole="button">
              <Text style={styles.textobotaosecundario}>Ver versão atual</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={{gap:6}}>
          <Text style={styles.label}>Título <Text style={{color:cores.vermelho}}>*</Text></Text>
          <TextInput
            style={[styles.input, erros.titulo ? {borderColor:cores.vermelho} : null]}
            value={titulo}
            onChangeText={setTitulo}
            maxLength={150}
            accessibilityLabel="Título"
          />
          {erros.titulo ? <Text style={styles.erro} accessibilityLiveRegion="polite">{erros.titulo}</Text> : null}
        </View>

        <View style={{gap:6}}>
          <Text style={styles.label}>Preço <Text style={{color:cores.vermelho}}>*</Text></Text>
          <View style={[styles.campopreco, erros.preco ? {borderColor:cores.vermelho} : null]}>
            <Text style={styles.caption}>R$</Text>
            <TextInput style={styles.inputpreco} value={preco} onChangeText={setPreco} keyboardType="decimal-pad" accessibilityLabel="Preço"/>
          </View>
          {erros.preco ? <Text style={styles.erro} accessibilityLiveRegion="polite">{erros.preco}</Text> : null}
        </View>

        <View style={{gap:6}}>
          <Text style={styles.label}>Estado de conservação <Text style={{color:cores.vermelho}}>*</Text></Text>
          <View accessibilityRole="radiogroup" accessibilityLabel="Estado de conservação">
            {ESTADOS.map((e)=>(
              <TouchableOpacity key={e.valor} style={styles.radio} onPress={()=> setEstado(e.valor)} accessibilityRole="radio" accessibilityLabel={e.texto} accessibilityState={{checked: estado == e.valor}}>
                <View style={[styles.bolinha, estado == e.valor && {borderColor:cores.verde}]}>
                  {estado == e.valor ? <View style={styles.bolinhadentro}/> : null}
                </View>
                <Text style={styles.textobranco}>{e.texto}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {erros.estado ? <Text style={styles.erro} accessibilityLiveRegion="polite">{erros.estado}</Text> : null}
        </View>

        <View style={{gap:6}}>
          <Text style={styles.label}>Descrição</Text>
          <TextInput
            style={[styles.input, {minHeight:100, textAlignVertical:'top', paddingTop:12}]}
            value={descricao}
            onChangeText={setDescricao}
            multiline
            accessibilityLabel="Descrição"
          />
          <Text style={styles.caption}>Não informe telefone, e-mail ou endereço.</Text>
        </View>

        {erroApi ? <Text style={styles.erro} accessibilityLiveRegion="polite">{erroApi}</Text> : null}
      </ScrollView>

      <View style={styles.rodape}>
        <TouchableOpacity style={styles.botaosecundario} onPress={()=> router.back()} accessibilityRole="button" accessibilityLabel="Cancelar">
          <Text style={styles.textobotaosecundario}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.botao, {flex:1}]} onPress={salvar} disabled={salvando} accessibilityRole="button" accessibilityLabel="Salvar alterações" accessibilityState={{busy: salvando}}>
          {salvando ? <ActivityIndicator color={cores.fundo}/> : <Text style={styles.textobotao}>Salvar alterações</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container:      {flex:1, backgroundColor:cores.fundo},
  titulotela:     {fontFamily:fontes.titulo, fontSize:24, color:cores.branco},
  label:          {fontFamily:fontes.textoForte, fontSize:14, color:cores.branco},
  input:          {minHeight:49, paddingHorizontal:16, borderRadius:12, borderWidth:1, borderColor:cores.borda, backgroundColor:cores.campo, color:cores.branco, fontFamily:fontes.texto, fontSize:15},
  campopreco:     {flexDirection:'row', alignItems:'center', gap:8, minHeight:49, paddingHorizontal:16, borderRadius:12, borderWidth:1, borderColor:cores.borda, backgroundColor:cores.campo},
  inputpreco:     {flex:1, fontFamily:fontes.titulo, fontSize:18, color:cores.branco},
  caption:        {fontFamily:fontes.textoMedio, fontSize:11, lineHeight:15, color:cores.cinza},
  radio:          {flexDirection:'row', alignItems:'center', gap:10, minHeight:44},
  bolinha:        {width:18, height:18, borderRadius:9, borderWidth:2, borderColor:cores.cinza, alignItems:'center', justifyContent:'center'},
  bolinhadentro:  {width:8, height:8, borderRadius:4, backgroundColor:cores.verde},
  textobranco:    {fontFamily:fontes.texto, fontSize:14, color:cores.branco},
  aviso:          {padding:12, borderRadius:12, borderWidth:1, borderColor:cores.verde, backgroundColor:cores.verdeFraco},
  textoaviso:     {fontFamily:fontes.textoMedio, fontSize:13, lineHeight:18, color:cores.verdeEsg},
  caixaerro:      {padding:12, borderRadius:12, borderWidth:1, borderColor:cores.vermelho, backgroundColor:cores.vermelhoFraco, gap:10},
  linha:          {flexDirection:'row', alignItems:'center', gap:8},
  erro:           {fontFamily:fontes.texto, fontSize:13, color:cores.vermelho},
  rodape:         {flexDirection:'row', gap:10, padding:16, paddingBottom:28, borderTopWidth:1, borderTopColor:cores.borda, backgroundColor:cores.fundo},
  botao:          {height:48, paddingHorizontal:18, borderRadius:12, backgroundColor:cores.verde, alignItems:'center', justifyContent:'center'},
  textobotao:     {fontFamily:fontes.textoForte, fontSize:15, color:cores.fundo},
  botaosecundario:{height:48, paddingHorizontal:18, borderRadius:12, borderWidth:1, borderColor:cores.borda, alignItems:'center', justifyContent:'center'},
  textobotaosecundario:{fontFamily:fontes.textoForte, fontSize:15, color:cores.branco},
})
