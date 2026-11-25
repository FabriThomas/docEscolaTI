import { URL_API } from './api'

let cenarioScanner = 'AUTO_L5'
let anuncios: any[] = []
let contador = 1
let fetchOriginal: any = null

export function mudarCenarioScanner(cenario: string){
  cenarioScanner = cenario
}

function anunciosIniciais(){
  const dia = 86400000
  return [
    {id: 'a1', title: 'Placa de vídeo genérica 8GB', priceCents: 165000, status: 'ATIVA', operationalState: 'FUNCIONA', views: 238, chats: 5, openProposals: 2, hasSchedule: false, inAuction: false, neighborhood: 'Bairro Centro', version: 1},
    {id: 'a2', title: 'Processador 6 núcleos + cooler', priceCents: 72000, status: 'ATIVA', operationalState: 'FUNCIONA', views: 96, chats: 2, openProposals: 0, hasSchedule: true, inAuction: false, neighborhood: 'Bairro Centro', version: 1},
    {id: 'a3', title: 'Kit memória 16GB DDR4', priceCents: 26000, status: 'PAUSADA', operationalState: 'FUNCIONA', views: 41, chats: 0, openProposals: 0, hasSchedule: false, inAuction: false, neighborhood: 'Bairro Centro', pausedAt: new Date(Date.now() - 3 * dia).toISOString(), version: 1},
    {id: 'a4', title: 'Fonte 500W', priceCents: 18000, status: 'REMOVIDA', operationalState: 'FUNCIONA_COM_DEFEITO', views: 12, chats: 0, openProposals: 0, hasSchedule: false, inAuction: false, neighborhood: 'Bairro Centro', moderationReason: 'Fotos de outro anúncio', version: 1},
    {id: 'a5', title: 'Gabinete mid tower', priceCents: 15000, status: 'EXPIRADA', operationalState: 'FUNCIONA', views: 30, chats: 1, openProposals: 0, hasSchedule: false, inAuction: false, neighborhood: 'Bairro Centro', closedAt: new Date(Date.now() - 40 * dia).toISOString(), version: 1},
  ]
}

export function resetarMock(){
  anuncios = anunciosIniciais()
  cenarioScanner = 'AUTO_L5'
}

function responder(status: number, corpo: any){
  return new Response(JSON.stringify(corpo), {status: status, headers: {'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json'}})
}

function erro(status: number, code: string, title: string, detail?: string){
  return responder(status, {type: 'about:blank', title: title, status: status, detail: detail || title, code: code, correlationId: 'mock'})
}

function temDadoPessoal(texto: string){
  return /\S+@\S+\.\S+/.test(texto) || /\d[\d\s().-]{7,}\d/.test(texto)
}

export async function respostaMock(caminho: string, metodo: string, body: any){
  await new Promise(r => setTimeout(r, 300))

  if(metodo == 'POST' && caminho == '/media'){
    contador++
    return responder(201, {mediaId: 'm' + contador, url: 'https://exemplo.invalid/offers-media/m' + contador + '.webp'})
  }

  if(metodo == 'POST' && caminho == '/scanner/analyze'){
    if(cenarioScanner == 'AUTO_L5') return responder(200, {decisionBand: 'AUTO_L5', confidence: 0.94, sugestao: {titulo: 'Placa de vídeo genérica 8GB', categoria: 'Placa de vídeo', especificacoes: ['8 GB GDDR6', 'PCIe 4.0', '200 W']}})
    if(cenarioScanner == 'TOP3_HYPOTHESES') return responder(200, {decisionBand: 'TOP3_HYPOTHESES', confidence: 0.62, candidates: [
      {titulo: 'Processador 6 núcleos geração 3', categoria: 'Processador', score: 0.62},
      {titulo: 'Processador 6 núcleos geração 2', categoria: 'Processador', score: 0.31},
      {titulo: 'Processador 8 núcleos geração 3', categoria: 'Processador', score: 0.27},
      {titulo: 'Processador 4 núcleos', categoria: 'Processador', score: 0.1},
    ]})
    if(cenarioScanner == 'MANUAL_CURATION') return responder(200, {decisionBand: 'MANUAL_CURATION', confidence: 0.3, categoria: 'Placa-mãe', categoriaConfianca: 0.74})
    if(cenarioScanner == 'LOW_QUALITY_RECAPTURE') return responder(200, {decisionBand: 'LOW_QUALITY_RECAPTURE', orientacao: 'Iluminação insuficiente — tente em um local mais claro'})
    if(cenarioScanner == 'DEMORA') return new Promise(()=>{})
    return responder(200, {decisionBand: 'CIRCUIT_OPEN_FALLBACK'})
  }

  if(metodo == 'GET' && caminho.startsWith('/offers/me')){
    return responder(200, {data: anuncios.filter(a => a.status != 'CANCELADA'), meta: {nextCursor: null, limit: 20, hasMore: false}})
  }

  if(metodo == 'GET' && caminho.startsWith('/offers/price-reference')){
    if(caminho.includes(encodeURIComponent('Placa de vídeo'))) return responder(200, {minCents: 155000, maxCents: 180000})
    return erro(404, 'PRICE_REFERENCE_NOT_FOUND', 'Sem referência para esse modelo')
  }

  if(metodo == 'POST' && caminho == '/offers'){
    if(anuncios.filter(a => a.status == 'ATIVA').length >= 20) return erro(422, 'OFFER_LIMIT_REACHED', 'Limite de anúncios atingido', 'Você já tem 20 anúncios ativos.')
    if(temDadoPessoal(body.description || '')) return erro(422, 'PII_OR_CONTACT_DETECTED', 'Dados pessoais na descrição', 'Tire telefone, e-mail ou endereço da descrição.')
    if(body.hazardousMaterial) return erro(422, 'VALIDATION_ERROR', 'Item com risco químico')
    contador++
    const novo = {id: 'a' + contador, title: body.title, description: body.description, priceCents: body.priceCents, operationalState: body.operationalState, status: 'EM_TRIAGEM', views: 0, chats: 0, openProposals: 0, hasSchedule: false, inAuction: false, neighborhood: body.neighborhood, version: 1}
    anuncios.push(novo)
    return responder(201, novo)
  }

  const acao = caminho.match(/^\/offers\/(\w+)\/(pause|reactivate|cancel)$/)
  if(metodo == 'POST' && acao){
    const a = anuncios.find(x => x.id == acao[1])
    if(!a) return erro(404, 'NOT_FOUND', 'Anúncio não encontrado')

    if(acao[2] == 'pause'){
      if(a.status != 'ATIVA') return erro(409, 'OFFER_INVALID_STATUS', 'Não dá para pausar', 'Só anúncio ativo pode ser pausado.')
      if(a.hasSchedule) return erro(409, 'OFFER_HAS_SCHEDULE', 'Não dá para pausar', 'Esse anúncio tem um encontro agendado. Cancele ou conclua o encontro antes.')
      if(a.inAuction) return erro(409, 'OFFER_IN_AUCTION', 'Não dá para pausar', 'Esse anúncio está em um leilão ativo.')
      if(!body || !body.reason) return erro(422, 'VALIDATION_ERROR', 'Informe o motivo')
      a.status = 'PAUSADA'
      a.pausedAt = new Date().toISOString()
    }
    if(acao[2] == 'reactivate'){
      if(a.status == 'REMOVIDA') return erro(409, 'OFFER_REMOVED_BY_MODERATION', 'Não dá para reabrir', 'Removido pela moderação: ' + a.moderationReason)
      if(a.status != 'PAUSADA' && a.status != 'EXPIRADA') return erro(409, 'OFFER_INVALID_STATUS', 'Não dá para reabrir', 'Só anúncio pausado ou expirado pode ser reaberto.')
      if(a.closedAt && Date.now() - new Date(a.closedAt).getTime() > 30 * 86400000) return erro(409, 'REOPEN_WINDOW_EXPIRED', 'Prazo de reabertura expirado', 'Passou o prazo de 30 dias. Crie um novo anúncio com os mesmos dados.')
      if(anuncios.filter(x => x.status == 'ATIVA').length >= 20) return erro(422, 'OFFER_LIMIT_REACHED', 'Limite de anúncios atingido', 'Você já tem 20 anúncios ativos.')
      if(body && body.priceCents) a.priceCents = body.priceCents
      if(body && body.operationalState) a.operationalState = body.operationalState
      a.status = 'EM_TRIAGEM'
    }
    if(acao[2] == 'cancel'){
      if(a.hasSchedule) return erro(409, 'OFFER_HAS_ACTIVE_LINKS', 'Não dá para excluir', 'Esse anúncio tem um encontro agendado.')
      a.status = 'CANCELADA'
    }
    return responder(200, a)
  }

  const um = caminho.match(/^\/offers\/(\w+)$/)
  if(um){
    const a = anuncios.find(x => x.id == um[1])
    if(!a) return erro(404, 'NOT_FOUND', 'Anúncio não encontrado')
    if(metodo == 'GET') return responder(200, a)
    if(metodo == 'PATCH'){
      if(!['ATIVA', 'PAUSADA', 'EM_TRIAGEM'].includes(a.status)) return erro(409, 'OFFER_INVALID_STATUS', 'Não dá para editar', 'Esse anúncio não pode mais ser editado.')
      if(body.version && a.version && body.version != a.version) return erro(409, 'OFFER_VERSION_CONFLICT', 'O anúncio mudou', 'Alguém alterou esse anúncio. Recarregue antes de salvar.')
      if(temDadoPessoal(body.description || '')) return erro(422, 'PII_OR_CONTACT_DETECTED', 'Dados pessoais na descrição', 'Tire telefone, e-mail ou endereço da descrição.')
      Object.assign(a, body, {status: a.status == 'ATIVA' ? 'EM_TRIAGEM' : a.status, version: (a.version || 1) + 1})
      return responder(200, a)
    }
  }

  return erro(501, 'NOT_IMPLEMENTED', 'mock ainda nao tem ' + metodo + ' ' + caminho)
}

export function ligarMock(){
  resetarMock()
  if(fetchOriginal) return
  fetchOriginal = globalThis.fetch
  globalThis.fetch = (async (url: any, opcoes: any = {})=>{
    const texto = String(url)
    if(!texto.startsWith(URL_API)) return fetchOriginal(url, opcoes)
    let body = opcoes.body
    if(typeof body == 'string') body = JSON.parse(body)
    return respostaMock(texto.replace(URL_API, ''), opcoes.method || 'GET', body)
  }) as any
}
