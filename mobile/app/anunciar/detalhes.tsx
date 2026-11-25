import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Image, Modal } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import Ionicons from '@expo/vector-icons/Ionicons'
import Topo from '../../src/Topo'
import { useRascunho, ESTADOS, CATEGORIAS, TEMPOS_USO } from '../../src/RascunhoContext'
import { prepararFotos, MAX_FOTOS } from '../../src/foto'
import { cores, fontes } from '../../src/cores'

function Seletor({nome, valor, opcoes, aoEscolher, erro}: {nome: string, valor: string, opcoes: string[], aoEscolher: (v: string)=>void, erro: boolean}){
  const [aberto, setAberto] = useState(false)
  return (
    <>
      <TouchableOpacity style={[styles.input, styles.seletor, erro ? styles.inputerro : null]} onPress={()=> setAberto(true)} accessibilityRole="button" accessibilityLabel={nome} accessibilityValue={{text: valor || 'Nada selecionado'}}>
        <Text style={[styles.textoinput, !valor && {color:cores.placeholder}]} numberOfLines={1}>{valor || 'Selecione'}</Text>
        <Ionicons name="chevron-down" size={16} color={cores.cinza}/>
      </TouchableOpacity>
      <Modal visible={aberto} transparent animationType="slide" onRequestClose={()=> setAberto(false)}>
        <View style={styles.fundomodal}>
          <View style={styles.caixamodal}>
            <Text style={styles.titulomodal}>{nome}</Text>
            {opcoes.map((o)=>(
              <TouchableOpacity key={o} style={[styles.opcao, valor == o && styles.opcaoativa]} onPress={()=>{ aoEscolher(o); setAberto(false) }} accessibilityRole="button" accessibilityLabel={o} accessibilityState={{selected: valor == o}}>
                <Text style={styles.textoopcao}>{o}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </>
  )
}

export default function Detalhes(){
  const router = useRouter()
  const {anuncio, setAnuncio} = useRascunho()

  const [erros, setErros] = useState<any>({})
  const [digitandoEspec, setDigitandoEspec] = useState(false)
  const [novaEspec, setNovaEspec] = useState('')
  const [carregandoFoto, setCarregandoFoto] = useState(false)

  const pedeDados = anuncio.categoria == 'Armazenamento' || anuncio.tipoOferta == 'MAQUINA'
  const precisaFotoDefeito = anuncio.estado != '' && anuncio.estado != 'FUNCIONA'

  function mudar(campo: string, valor: any){
    setAnuncio({...anuncio, [campo]: valor})
  }

  function digitar(campo: string, valor: any){
    setAnuncio({...anuncio, [campo]: valor, origem: {...anuncio.origem, [campo]: 'MANUAL'}})
  }

  function continuar(){
    const e: any = {}
    if(!anuncio.titulo.trim()) e.titulo = 'Campo obrigatório'
    if(!anuncio.categoria) e.categoria = 'Campo obrigatório'
    if(!anuncio.tempoUso) e.tempoUso = 'Campo obrigatório'
    if(!anuncio.estado) e.estado = 'Campo obrigatório'
    if(precisaFotoDefeito && anuncio.fotosDefeito.length == 0) e.defeito = 'Adicione pelo menos uma foto do defeito'
    if(pedeDados && !anuncio.situacaoDados) e.dados = 'Marque uma das opções'
    if(anuncio.materialPerigoso) e.perigoso = 'Itens com risco químico não podem ser anunciados. Leve a peça a um Ecoponto para o descarte correto.'
    setErros(e)
    if(Object.keys(e).length > 0) return
    router.push('/anunciar/preco')
  }

  function addEspec(){
    const texto = novaEspec.trim()
    if(texto && !anuncio.especificacoes.includes(texto)){
      digitar('especificacoes', [...anuncio.especificacoes, texto])
    }
    setNovaEspec('')
    setDigitandoEspec(false)
  }

  async function fotoDefeito(){
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if(!permissao.granted){
      alert('precisa liberar o acesso as fotos')
      return
    }
    const res = await ImagePicker.launchImageLibraryAsync({mediaTypes: ['images'], allowsMultipleSelection: true, exif: true})
    if(res.canceled) return
    setCarregandoFoto(true)
    try {
      const resultado = await prepararFotos(res.assets)
      setAnuncio((a: any)=> ({...a, fotosDefeito: a.estado == 'FUNCIONA' ? [] : [...a.fotosDefeito, ...resultado.prontas].slice(0, MAX_FOTOS)}))
      if(resultado.erros.length > 0) alert(resultado.erros[0])
    } catch(err){
      alert('erro ao preparar a foto do defeito')
    }
    setCarregandoFoto(false)
  }

  function Selo({campo, nome}: {campo: string, nome: string}){
    const origem = anuncio.origem[campo]
    if(!origem) return null
    const ia = origem == 'IA'
    const texto = ia ? 'Identificado por IA' : 'Preenchimento Manual'
    return (
      <View style={[styles.selo, !ia && {backgroundColor:cores.cinzaFraco}]} accessible accessibilityLabel={nome + ': ' + texto}>
        <Ionicons name={ia ? 'sparkles' : 'create-outline'} size={12} color={ia ? cores.verde : cores.cinza}/>
        <Text style={[styles.textoselo, {color: ia ? cores.verde : cores.cinza}]}>{texto}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <Topo etapa={2} subtitulo="Detalhes do item"/>

        {anuncio.scanner ? (
          <View style={styles.caixascanner}>
            <Ionicons name="sparkles" size={18} color={cores.verde}/>
            <View style={{flex:1}}>
              <Text style={styles.label}>Identificado pelo Scanner IA</Text>
              <Text style={styles.textoscanner}>{anuncio.scanner.nome} · {Math.round(anuncio.scanner.confianca * 100)}% de confiança</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.linhalabel}>
          <Text style={styles.label}>Título <Text style={styles.asterisco}>*</Text></Text>
          <Selo campo="titulo" nome="Título"/>
        </View>
        <TextInput
          style={[styles.input, erros.titulo ? styles.inputerro : null]}
          value={anuncio.titulo}
          onChangeText={(t)=> digitar('titulo', t)}
          placeholder="RTX 3060 Ti 8GB Gigabyte Gaming OC"
          placeholderTextColor={cores.placeholder}
          accessibilityLabel="Título"
          maxLength={150}
        />
        {erros.titulo ? <Text style={styles.erro} accessibilityLiveRegion="polite">{erros.titulo}</Text> : null}

        <Text style={[styles.label, {marginTop:16}]}>Tipo de oferta</Text>
        <View accessibilityRole="radiogroup" style={styles.duascolunas}>
          {[{valor: 'PECA', texto: 'Peça Avulsa'}, {valor: 'MAQUINA', texto: 'PC Montado'}].map((t)=>(
            <TouchableOpacity key={t.valor} style={[styles.radio, {flex:1, marginTop:8}, anuncio.tipoOferta == t.valor && styles.radioativo]} onPress={()=> mudar('tipoOferta', t.valor)} accessibilityRole="radio" accessibilityLabel={t.texto} accessibilityState={{checked: anuncio.tipoOferta == t.valor}}>
              <View style={[styles.bolinha, anuncio.tipoOferta == t.valor && {borderColor:cores.verde}]}>
                {anuncio.tipoOferta == t.valor ? <View style={styles.bolinhadentro}/> : null}
              </View>
              <Text style={styles.textoradio}>{t.texto}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.linhalabel}>
          <Text style={styles.label}>Modelo</Text>
          <Selo campo="modelo" nome="Modelo"/>
        </View>
        <TextInput
          style={styles.input}
          value={anuncio.modelo}
          onChangeText={(t)=> digitar('modelo', t)}
          placeholderTextColor={cores.placeholder}
          accessibilityLabel="Modelo"
        />

        <View style={styles.duascolunas}>
          <View style={{flex:1}}>
            <View style={styles.linhalabel}>
              <Text style={styles.label}>Categoria <Text style={styles.asterisco}>*</Text></Text>
              <Selo campo="categoria" nome="Categoria"/>
            </View>
            <Seletor nome="Categoria" valor={anuncio.categoria} opcoes={CATEGORIAS} aoEscolher={(v)=> digitar('categoria', v)} erro={!!erros.categoria}/>
            {erros.categoria ? <Text style={styles.erro} accessibilityLiveRegion="polite">{erros.categoria}</Text> : null}
          </View>
          <View style={{flex:1}}>
            <View style={styles.linhalabel}>
              <Text style={styles.label}>Tempo de uso <Text style={styles.asterisco}>*</Text></Text>
            </View>
            <Seletor nome="Tempo de uso" valor={anuncio.tempoUso} opcoes={TEMPOS_USO} aoEscolher={(v)=> mudar('tempoUso', v)} erro={!!erros.tempoUso}/>
            {erros.tempoUso ? <Text style={styles.erro} accessibilityLiveRegion="polite">{erros.tempoUso}</Text> : null}
          </View>
        </View>

        <View style={styles.linhalabel}>
          <Text style={styles.label}>Estado de conservação <Text style={styles.asterisco}>*</Text></Text>
          <Selo campo="estado" nome="Estado de conservação"/>
        </View>
        <View accessibilityRole="radiogroup" style={[{gap:8, marginTop:8}, erros.estado ? styles.caixaerro : null]}>
          {ESTADOS.map((e)=>(
            <TouchableOpacity
              key={e.valor}
              style={[styles.radio, anuncio.estado == e.valor && styles.radioativo]}
              onPress={()=> setAnuncio({...anuncio, estado: e.valor, origem: {...anuncio.origem, estado: 'MANUAL'}, fotosDefeito: e.valor == 'FUNCIONA' ? [] : anuncio.fotosDefeito})}
              accessibilityRole="radio"
              accessibilityLabel={e.texto}
              accessibilityState={{checked: anuncio.estado == e.valor}}
            >
              <View style={[styles.bolinha, anuncio.estado == e.valor && {borderColor:cores.verde}]}>
                {anuncio.estado == e.valor ? <View style={styles.bolinhadentro}/> : null}
              </View>
              <Text style={styles.textoradio}>{e.texto}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {erros.estado ? <Text style={styles.erro} accessibilityLiveRegion="polite">{erros.estado}</Text> : null}
        <View style={styles.dica}>
          <Ionicons name="information-circle-outline" size={14} color={cores.cinza}/>
          <Text style={styles.textodica}>Com defeito exige fotos detalhadas do problema.</Text>
        </View>

        {precisaFotoDefeito && (
          <>
            <Text style={[styles.label, {marginTop:18}]}>Fotos do defeito <Text style={styles.asterisco}>*</Text></Text>
            <View style={styles.tags}>
              {anuncio.fotosDefeito.map((f: any, i: number)=>(
                <TouchableOpacity key={f.id} onPress={()=> mudar('fotosDefeito', anuncio.fotosDefeito.filter((x: any)=> x.id !== f.id))} accessibilityRole="button" accessibilityLabel={'Remover foto do defeito ' + (i + 1)}>
                  <Image source={{uri: f.uri}} style={styles.fotodefeito}/>
                  <View style={styles.removerfoto}><Ionicons name="close" size={12} color={cores.branco}/></View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.tag, styles.tagadd]} onPress={fotoDefeito} disabled={carregandoFoto} accessibilityRole="button" accessibilityLabel="Adicionar foto do defeito">
                <Ionicons name="add" size={14} color={cores.verde}/>
                <Text style={[styles.textotag, {color:cores.verde}]}>{carregandoFoto ? 'Preparando...' : 'Adicionar'}</Text>
              </TouchableOpacity>
            </View>
            {erros.defeito ? <Text style={styles.erro} accessibilityLiveRegion="polite">{erros.defeito}</Text> : null}
          </>
        )}

        <View style={styles.linhalabel}>
          <Text style={styles.label}>Especificações técnicas</Text>
          <Selo campo="especificacoes" nome="Especificações técnicas"/>
        </View>
        <View style={styles.tags}>
          {anuncio.especificacoes.map((esp: string)=>(
            <TouchableOpacity key={esp} style={styles.tag} onPress={()=> digitar('especificacoes', anuncio.especificacoes.filter((x: string)=> x !== esp))} accessibilityRole="button" accessibilityLabel={'Remover ' + esp}>
              <Text style={styles.textotag}>{esp}</Text>
              <Ionicons name="close" size={12} color={cores.cinza}/>
            </TouchableOpacity>
          ))}
          {digitandoEspec ? (
            <TextInput
              style={[styles.tag, styles.inputtag]}
              value={novaEspec}
              onChangeText={setNovaEspec}
              onSubmitEditing={addEspec}
              onBlur={addEspec}
              autoFocus
              placeholder="8 GB GDDR6"
              placeholderTextColor={cores.placeholder}
              accessibilityLabel="Nova especificação"
            />
          ) : (
            <TouchableOpacity style={[styles.tag, styles.tagadd]} onPress={()=> setDigitandoEspec(true)} accessibilityRole="button" accessibilityLabel="Adicionar especificação">
              <Ionicons name="add" size={14} color={cores.verde}/>
              <Text style={[styles.textotag, {color:cores.verde}]}>Adicionar</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.label, {marginTop:16}]}>Número de série (S/N)</Text>
        <TextInput
          style={styles.input}
          value={anuncio.numeroSerie}
          onChangeText={(t)=> mudar('numeroSerie', t)}
          autoCapitalize="characters"
          placeholderTextColor={cores.placeholder}
          accessibilityLabel="Número de série (S/N)"
        />
        <Text style={styles.textodica}>Recomendado. Ajuda o comprador a conferir a peça.</Text>

        <View style={styles.linhalabel}>
          <Text style={styles.label}>Descrição</Text>
          <Selo campo="descricao" nome="Descrição"/>
        </View>
        <TextInput
          style={[styles.input, {height:96, textAlignVertical:'top', paddingTop:12}]}
          value={anuncio.descricao}
          onChangeText={(t)=> digitar('descricao', t)}
          multiline
          placeholder="Usada em PC gamer, nunca minerou. Acompanha caixa original."
          placeholderTextColor={cores.placeholder}
          accessibilityLabel="Descrição"
        />
        <View style={styles.dica}>
          <Ionicons name="shield-checkmark-outline" size={14} color={cores.cinza}/>
          <Text style={styles.textodica}>Não informe telefone, e-mail ou endereço — dados pessoais são ocultados.</Text>
        </View>

        {pedeDados && (
          <>
            <Text style={[styles.label, {marginTop:16}]}>Situação dos dados <Text style={styles.asterisco}>*</Text></Text>
            <View accessibilityRole="radiogroup" style={[styles.duascolunas, erros.dados ? styles.caixaerro : null]}>
              {[{valor: 'REMOVIDO', texto: 'Dados removidos'}, {valor: 'CONTEM', texto: 'Contém dados'}].map((d)=>(
                <TouchableOpacity key={d.valor} style={[styles.radio, {flex:1, marginTop:8}, anuncio.situacaoDados == d.valor && styles.radioativo]} onPress={()=> mudar('situacaoDados', d.valor)} accessibilityRole="radio" accessibilityLabel={d.texto} accessibilityState={{checked: anuncio.situacaoDados == d.valor}}>
                  <View style={[styles.bolinha, anuncio.situacaoDados == d.valor && {borderColor:cores.verde}]}>
                    {anuncio.situacaoDados == d.valor ? <View style={styles.bolinhadentro}/> : null}
                  </View>
                  <Text style={styles.textoradio}>{d.texto}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {erros.dados ? <Text style={styles.erro} accessibilityLiveRegion="polite">{erros.dados}</Text> : null}
          </>
        )}

        <TouchableOpacity style={styles.check} onPress={()=> mudar('materialPerigoso', !anuncio.materialPerigoso)} accessibilityRole="checkbox" accessibilityState={{checked: anuncio.materialPerigoso}} accessibilityLabel="O item tem risco químico (bateria vazando ou material tóxico)">
          <View style={[styles.quadrado, anuncio.materialPerigoso && {backgroundColor:cores.vermelho, borderColor:cores.vermelho}]}>
            {anuncio.materialPerigoso ? <Ionicons name="checkmark" size={14} color={cores.fundo}/> : null}
          </View>
          <Text style={styles.textoradio}>O item tem risco químico (bateria vazando ou material tóxico)</Text>
        </TouchableOpacity>
        {erros.perigoso ? <Text style={styles.erro} accessibilityLiveRegion="polite">{erros.perigoso}</Text> : null}

      </ScrollView>

      <View style={styles.rodape}>
        <TouchableOpacity style={styles.botaovoltar} onPress={()=> router.back()} accessibilityRole="button" accessibilityLabel="Voltar">
          <Text style={styles.textovoltar}>Voltar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.botao} onPress={continuar} accessibilityRole="button" accessibilityLabel="Continuar">
          <Text style={styles.textobotao}>Continuar</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container:     {flex:1, backgroundColor:cores.fundo},
  conteudo:      {paddingHorizontal:24, paddingTop:42, paddingBottom:24},
  caixascanner:  {flexDirection:'row', gap:10, alignItems:'center', padding:12, borderRadius:12, backgroundColor:cores.verdeMedio, marginTop:16},
  textoscanner:  {fontFamily:fontes.texto, fontSize:13, color:cores.cinza},
  linhalabel:    {flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop:16, marginBottom:6},
  label:         {fontFamily:fontes.textoForte, fontSize:13, color:cores.branco},
  asterisco:     {color:cores.vermelho},
  selo:          {flexDirection:'row', alignItems:'center', gap:4, paddingHorizontal:8, height:22, borderRadius:999, backgroundColor:cores.verdeForte},
  textoselo:     {fontFamily:fontes.textoMedio, fontSize:11},
  input:         {height:48, borderRadius:12, borderWidth:1, borderColor:cores.borda, backgroundColor:cores.campo, paddingHorizontal:14, fontFamily:fontes.texto, fontSize:15, color:cores.branco},
  inputerro:     {borderColor:cores.vermelho},
  seletor:       {flexDirection:'row', alignItems:'center', justifyContent:'space-between'},
  textoinput:    {flex:1, fontFamily:fontes.texto, fontSize:15, color:cores.branco},
  erro:          {fontFamily:fontes.texto, fontSize:13, color:cores.vermelho, marginTop:6},
  caixaerro:     {borderRadius:12, borderWidth:1, borderColor:cores.vermelho, padding:6},
  duascolunas:   {flexDirection:'row', gap:10},
  radio:         {flexDirection:'row', alignItems:'center', gap:10, minHeight:48, paddingHorizontal:14, borderRadius:12, borderWidth:1, borderColor:cores.borda, backgroundColor:cores.campo},
  radioativo:    {borderColor:cores.verde, backgroundColor:cores.verdeFraco},
  bolinha:       {width:18, height:18, borderRadius:9, borderWidth:1.5, borderColor:cores.cinza, alignItems:'center', justifyContent:'center'},
  bolinhadentro: {width:8, height:8, borderRadius:4, backgroundColor:cores.verde},
  textoradio:    {flex:1, fontFamily:fontes.texto, fontSize:14, color:cores.branco},
  dica:          {flexDirection:'row', gap:6, marginTop:8},
  textodica:     {flex:1, fontFamily:fontes.textoMedio, fontSize:11, lineHeight:14, color:cores.cinza, marginTop:4},
  tags:          {flexDirection:'row', flexWrap:'wrap', gap:8, marginTop:8},
  tag:           {flexDirection:'row', alignItems:'center', gap:6, height:32, paddingHorizontal:12, borderRadius:999, borderWidth:1, borderColor:cores.borda, backgroundColor:cores.campo},
  tagadd:        {borderStyle:'dashed', borderColor:cores.verde},
  inputtag:      {minWidth:120, color:cores.branco, fontFamily:fontes.texto, fontSize:13},
  textotag:      {fontFamily:fontes.textoMedio, fontSize:13, color:cores.branco},
  fotodefeito:   {width:64, height:64, borderRadius:8},
  removerfoto:   {position:'absolute', top:4, right:4, width:18, height:18, borderRadius:9, backgroundColor:cores.fundoFoto, alignItems:'center', justifyContent:'center'},
  check:         {flexDirection:'row', alignItems:'center', gap:10, marginTop:18},
  quadrado:      {width:20, height:20, borderRadius:6, borderWidth:1.5, borderColor:cores.cinza, alignItems:'center', justifyContent:'center'},
  rodape:        {flexDirection:'row', paddingTop:14, paddingHorizontal:24, paddingBottom:26, borderTopWidth:1, borderColor:cores.borda, backgroundColor:cores.fundo},
  botaovoltar:   {height:48, paddingHorizontal:18, borderRadius:12, borderWidth:1, borderColor:cores.borda, backgroundColor:cores.campo, justifyContent:'center', marginRight:12},
  textovoltar:   {fontFamily:fontes.textoForte, fontSize:15, color:cores.branco},
  botao:         {flex:1, height:48, borderRadius:12, backgroundColor:cores.verde, alignItems:'center', justifyContent:'center'},
  textobotao:    {fontFamily:fontes.textoForte, fontSize:15, color:cores.fundo},
  fundomodal:    {flex:1, backgroundColor:cores.fundoModal, justifyContent:'flex-end'},
  caixamodal:    {backgroundColor:cores.card, padding:20, borderTopLeftRadius:18, borderTopRightRadius:18, gap:10},
  titulomodal:   {fontFamily:fontes.titulo, fontSize:18, color:cores.branco, marginBottom:4},
  opcao:         {padding:14, minHeight:48, borderRadius:12, borderWidth:1, borderColor:cores.borda, backgroundColor:cores.campo},
  opcaoativa:    {borderColor:cores.verde},
  textoopcao:    {fontFamily:fontes.textoForte, fontSize:15, color:cores.branco},
})
