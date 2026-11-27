import { delay, http, HttpResponse } from 'msw'

/**
 * Simulação dos anúncios com o mesmo contrato do FastAPI (EDTS-373): snake_case, cursor,
 * busca por raio, favoritos, comparador, pausar, boost e estatísticas. Usada sem backend e nos testes.
 */

type Foto = { id: string; storage_path: string; size_bytes: number; width: number; height: number; format: string; exif_stripped: boolean; sha256_hash: string; is_cover: boolean }
type Registro = {
  id: string
  seller_id: string
  titulo: string
  descricao: string | null
  categoria: string
  marca: string | null
  modelo_ou_sku: string | null
  condicao: string
  preco_centavos: number
  status: 'ATIVA' | 'PAUSADA' | 'REMOVIDA'
  bairro_aproximado: string | null
  cidade: string
  estado: string
  latitude: number
  longitude: number
  specs: Record<string, string>
  fotos: Foto[]
  boost_active_until: string | null
  views_count: number
  created_at: string
  updated_at: string
}

const BASE = '*/api/v1/anuncios'
const LATENCIA = import.meta.env.MODE === 'test' ? 0 : 300

const horasAtras = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()

function semente(): Registro[] {
  const base = (r: Partial<Registro> & Pick<Registro, 'id' | 'seller_id' | 'titulo' | 'categoria' | 'preco_centavos'>, h: number): Registro => ({
    descricao: null,
    marca: null,
    modelo_ou_sku: null,
    condicao: 'USADO',
    status: 'ATIVA',
    bairro_aproximado: 'Zona 7',
    cidade: 'Maringá',
    estado: 'PR',
    latitude: -23.4075,
    longitude: -51.9389,
    specs: {},
    fotos: [],
    boost_active_until: null,
    views_count: 0,
    created_at: horasAtras(h),
    updated_at: horasAtras(h),
    ...r,
  })
  return [
    base({ id: 'an-rtx3060ti', seller_id: 'usr_ana', titulo: 'RTX 3060 Ti 8 GB ASUS Dual', categoria: 'gpu', marca: 'ASUS', modelo_ou_sku: 'DUAL-RTX3060TI-O8G', condicao: 'SEMINOVO', preco_centavos: 175000, descricao: 'Placa testada, sem mineração. Acompanha caixa.', specs: { VRAM: '8 GB GDDR6', TDP: '200 W' }, boost_active_until: new Date(Date.now() + 86_400_000).toISOString(), views_count: 48 }, 30),
    base({ id: 'an-ryzen5600', seller_id: 'usr_bruno', titulo: 'Ryzen 5 5600 com cooler box', categoria: 'cpu', marca: 'AMD', modelo_ou_sku: '100-100000927BOX', preco_centavos: 62000, bairro_aproximado: 'Centro', latitude: -23.42, longitude: -51.93, specs: { Núcleos: '6', Threads: '12', Soquete: 'AM4' } }, 5),
    base({ id: 'an-ddr4-16', seller_id: 'usr_ana', titulo: 'Kit 16 GB DDR4 3200 (2x8)', categoria: 'ram', marca: 'Kingston', condicao: 'USADO', preco_centavos: 18000, specs: { Capacidade: '16 GB', Frequência: '3200 MHz' } }, 12),
    base({ id: 'an-ssd-1tb', seller_id: 'usr_bruno', titulo: 'SSD NVMe 1 TB', categoria: 'storage', marca: 'WD', condicao: 'SEMINOVO', preco_centavos: 32000, cidade: 'Londrina', bairro_aproximado: 'Gleba Palhano', latitude: -23.33, longitude: -51.18, specs: { Capacidade: '1 TB', Interface: 'PCIe 3.0 x4' } }, 20),
    base({ id: 'an-b550', seller_id: 'usr_ana', titulo: 'Placa-mãe B550M AORUS Elite', categoria: 'motherboard', marca: 'Gigabyte', preco_centavos: 54000, specs: { Soquete: 'AM4', Formato: 'Micro-ATX' } }, 40),
    base({ id: 'an-gtx960', seller_id: 'usr_bruno', titulo: 'GTX 960 2 GB com defeito (artefatos)', categoria: 'gpu', marca: 'MSI', condicao: 'DEFEITO_SUCATA', preco_centavos: 9000, descricao: 'Liga, mas mostra artefatos na tela. Boa para peças ou reciclagem.', specs: { VRAM: '2 GB GDDR5', TDP: '120 W' } }, 60),
    base({ id: 'an-fonte650', seller_id: 'usr_ana', titulo: 'Fonte 650 W 80 Plus Bronze', categoria: 'psu', marca: 'Corsair', preco_centavos: 28000, cidade: 'Curitiba', bairro_aproximado: 'Batel', latitude: -25.44, longitude: -49.29, specs: { Potência: '650 W', Certificação: '80 Plus Bronze' } }, 8),
  ]
}

let anuncios: Registro[] = semente()
let favoritos = new Map<string, Set<string>>()

export function reiniciarAnuncios() {
  anuncios = semente()
  favoritos = new Map()
}

const ativo = (r: Registro) => r.status === 'ATIVA'
const impulsionado = (r: Registro) => Boolean(r.boost_active_until && Date.parse(r.boost_active_until) > Date.now())

function distanciaKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = (g: number) => (g * Math.PI) / 180
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(a)) * 100) / 100
}

function resposta(r: Registro, distancia_km: number | null = null) {
  const { latitude, longitude, ...resto } = r
  return {
    ...resto,
    fuzzy_latitude: Math.round(latitude * 100) / 100,
    fuzzy_longitude: Math.round(longitude * 100) / 100,
    distancia_km,
    favorites_count: favoritos.get(r.id)?.size ?? 0,
  }
}

function problema(status: number, code: string, detail: string) {
  return HttpResponse.json({ type: 'about:blank', title: detail, status, detail, code, correlationId: crypto.randomUUID(), errors: [] }, { status, headers: { 'Content-Type': 'application/problem+json' } })
}

type Autenticar = (request: Request) => { usuario: { id: string } } | null

export function handlersAnuncios(autenticar: Autenticar) {
  const exigirDono = (request: Request, id: string) => {
    const atual = autenticar(request)
    if (!atual) return { erro: problema(401, 'UNAUTHENTICATED', 'Envie Authorization: Bearer <jwt>.') }
    const r = anuncios.find((a) => a.id === id && a.status !== 'REMOVIDA')
    if (!r) return { erro: problema(404, 'LISTING_NOT_FOUND', `Anuncio ${id} nao encontrado.`) }
    if (r.seller_id !== atual.usuario.id) return { erro: problema(403, 'FORBIDDEN_LISTING_OPERATION', 'Somente o proprietario do anuncio pode realizar esta operacao.') }
    return { r, usuario: atual.usuario }
  }

  return [
    http.get(`${BASE}/`, async ({ request }) => {
      await delay(LATENCIA)
      const url = new URL(request.url)
      const cursor = url.searchParams.get('cursor')
      const limite = Number(url.searchParams.get('limit') ?? 10)
      const categoria = url.searchParams.get('categoria')
      const lista = anuncios
        .filter((a) => ativo(a) && (!categoria || a.categoria === categoria))
        .sort((a, b) => Number(impulsionado(b)) - Number(impulsionado(a)) || b.created_at.localeCompare(a.created_at))
      const inicio = cursor ? lista.findIndex((a) => a.id === cursor) + 1 : 0
      const pagina = lista.slice(inicio, inicio + limite)
      const mais = inicio + limite < lista.length
      return HttpResponse.json({ items: pagina.map((a) => resposta(a)), next_cursor: mais ? (pagina.at(-1)?.id ?? null) : null, has_more: mais, limit: limite })
    }),

    http.get(`${BASE}/busca`, async ({ request }) => {
      await delay(LATENCIA)
      const p = new URL(request.url).searchParams
      const num = (k: string) => (p.get(k) ? Number(p.get(k)) : null)
      const q = p.get('q')?.toLowerCase().trim()
      const lat = num('lat')
      const lon = num('lon')
      const raio = num('raio_km') ?? 25
      const itens = anuncios
        .filter((a) => ativo(a))
        .filter((a) => !p.get('categoria') || a.categoria === p.get('categoria'))
        .filter((a) => !p.get('condicao') || a.condicao === p.get('condicao'))
        .filter((a) => num('preco_min_centavos') === null || a.preco_centavos >= (num('preco_min_centavos') as number))
        .filter((a) => num('preco_max_centavos') === null || a.preco_centavos <= (num('preco_max_centavos') as number))
        .filter((a) => !q || a.titulo.toLowerCase().includes(q) || (a.modelo_ou_sku ?? '').toLowerCase().includes(q))
        .map((a) => ({ a, d: lat !== null && lon !== null ? distanciaKm(lat, lon, a.latitude, a.longitude) : null }))
        .filter(({ d }) => d === null || d <= raio)
        .sort((x, y) => (x.d !== null && y.d !== null ? x.d - y.d : y.a.created_at.localeCompare(x.a.created_at)))
      return HttpResponse.json(itens.map(({ a, d }) => resposta(a, d)))
    }),

    http.get(`${BASE}/favoritos/meus`, async ({ request }) => {
      await delay(LATENCIA)
      const atual = autenticar(request)
      if (!atual) return problema(401, 'UNAUTHENTICATED', 'Envie Authorization: Bearer <jwt>.')
      return HttpResponse.json(anuncios.filter((a) => favoritos.get(a.id)?.has(atual.usuario.id)).map((a) => resposta(a)))
    }),

    http.get(`${BASE}/comparador`, async ({ request }) => {
      await delay(LATENCIA)
      const ids = (new URL(request.url).searchParams.get('ids') ?? '').split(',').map((i) => i.trim()).filter(Boolean)
      if (ids.length < 2 || ids.length > 4) return problema(422, 'INVALID_COMPARATOR_SELECTION', 'Informe entre 2 e 4 IDs de anuncios para comparar.')
      const escolhidos = ids.map((id) => anuncios.find((a) => a.id === id))
      if (escolhidos.some((a) => !a)) return problema(404, 'LISTING_NOT_FOUND', 'Anuncio nao encontrado para comparacao.')
      const lista = escolhidos as Registro[]
      const chaves = [...new Set(lista.flatMap((a) => Object.keys(a.specs)))].sort()
      return HttpResponse.json({
        total_comparados: lista.length,
        anuncios: lista.map((a) => resposta(a)),
        spec_keys: chaves,
        specs_matrix: Object.fromEntries(chaves.map((k) => [k, Object.fromEntries(lista.map((a) => [a.id, a.specs[k] ?? null]))])),
      })
    }),

    http.get(`${BASE}/:id`, async ({ params }) => {
      await delay(LATENCIA)
      const r = anuncios.find((a) => a.id === params.id && a.status !== 'REMOVIDA')
      if (!r) return problema(404, 'LISTING_NOT_FOUND', `Anuncio ${String(params.id)} nao encontrado.`)
      r.views_count++
      return HttpResponse.json(resposta(r))
    }),

    http.post(`${BASE}/`, async ({ request }) => {
      await delay(LATENCIA)
      const atual = autenticar(request)
      if (!atual) return problema(401, 'UNAUTHENTICATED', 'Envie Authorization: Bearer <jwt>.')
      const d = (await request.json()) as Omit<Registro, 'id' | 'seller_id' | 'status' | 'fotos' | 'boost_active_until' | 'views_count' | 'created_at' | 'updated_at'>
      const agora = new Date().toISOString()
      const r: Registro = { ...d, categoria: d.categoria.toLowerCase(), estado: d.estado.toUpperCase(), specs: d.specs ?? {}, id: `an-${crypto.randomUUID().slice(0, 10)}`, seller_id: atual.usuario.id, status: 'ATIVA', fotos: [], boost_active_until: null, views_count: 0, created_at: agora, updated_at: agora }
      anuncios.push(r)
      return HttpResponse.json(resposta(r), { status: 201 })
    }),

    http.post(`${BASE}/:id/fotos`, async ({ request, params }) => {
      await delay(LATENCIA)
      const dono = exigirDono(request, String(params.id))
      if (dono.erro) return dono.erro
      const arquivos = (await request.formData()).getAll('files').filter((f): f is File => typeof f !== 'string')
      if (dono.r.fotos.length + arquivos.length > 6) return problema(422, 'PHOTO_LIMIT_EXCEEDED', 'Maximo de 6 fotos por anuncio.')
      const novas = arquivos.map((f, i) => ({
        id: `img-${crypto.randomUUID().slice(0, 8)}`,
        storage_path: `offers-media/${dono.usuario.id}/${dono.r.id}/foto.webp`,
        size_bytes: Math.min(f.size, 300 * 1024),
        width: 800,
        height: 600,
        format: 'WEBP',
        exif_stripped: true,
        sha256_hash: '0'.repeat(64),
        is_cover: dono.r.fotos.length === 0 && i === 0,
      }))
      dono.r.fotos.push(...novas)
      return HttpResponse.json(novas)
    }),

    http.patch(`${BASE}/:id`, async ({ request, params }) => {
      await delay(LATENCIA)
      const dono = exigirDono(request, String(params.id))
      if (dono.erro) return dono.erro
      const d = (await request.json()) as Partial<Registro>
      for (const [k, v] of Object.entries(d)) if (v !== null && v !== undefined) Object.assign(dono.r, { [k]: v })
      dono.r.updated_at = new Date().toISOString()
      return HttpResponse.json(resposta(dono.r))
    }),

    http.post(`${BASE}/:id/pausar`, async ({ request, params }) => {
      await delay(LATENCIA)
      const dono = exigirDono(request, String(params.id))
      if (dono.erro) return dono.erro
      dono.r.status = 'PAUSADA'
      return HttpResponse.json(resposta(dono.r))
    }),

    http.post(`${BASE}/:id/reativar`, async ({ request, params }) => {
      await delay(LATENCIA)
      const dono = exigirDono(request, String(params.id))
      if (dono.erro) return dono.erro
      dono.r.status = 'ATIVA'
      return HttpResponse.json(resposta(dono.r))
    }),

    http.delete(`${BASE}/:id`, async ({ request, params }) => {
      await delay(LATENCIA)
      const dono = exigirDono(request, String(params.id))
      if (dono.erro) return dono.erro
      dono.r.status = 'REMOVIDA'
      return HttpResponse.json({ anuncio_id: dono.r.id, status: 'REMOVIDA' })
    }),

    http.post(`${BASE}/:id/boost`, async ({ request, params }) => {
      await delay(LATENCIA)
      const dono = exigirDono(request, String(params.id))
      if (dono.erro) return dono.erro
      const { duracao_horas = 24, moedas_custo = 20 } = (await request.json()) as { duracao_horas?: number; moedas_custo?: number }
      dono.r.boost_active_until = new Date(Date.now() + duracao_horas * 3_600_000).toISOString()
      return HttpResponse.json({ anuncio_id: dono.r.id, boost_active_until: dono.r.boost_active_until, moedas_debitadas: moedas_custo, status: 'BOOST_ATIVO' })
    }),

    http.get(`${BASE}/:id/estatisticas`, async ({ request, params }) => {
      await delay(LATENCIA)
      const dono = exigirDono(request, String(params.id))
      if (dono.erro) return dono.erro
      return HttpResponse.json({
        anuncio_id: dono.r.id,
        status: dono.r.status,
        views_count: dono.r.views_count,
        favorites_count: favoritos.get(dono.r.id)?.size ?? 0,
        fotos_count: dono.r.fotos.length,
        boost_ativo: impulsionado(dono.r),
        boost_active_until: dono.r.boost_active_until,
      })
    }),

    http.post(`${BASE}/:id/favorito`, async ({ request, params }) => {
      await delay(LATENCIA)
      const atual = autenticar(request)
      if (!atual) return problema(401, 'UNAUTHENTICATED', 'Envie Authorization: Bearer <jwt>.')
      const id = String(params.id)
      if (!anuncios.some((a) => a.id === id && a.status !== 'REMOVIDA')) return problema(404, 'LISTING_NOT_FOUND', `Anuncio ${id} nao encontrado.`)
      const conjunto = favoritos.get(id) ?? new Set<string>()
      const marcado = !conjunto.has(atual.usuario.id)
      if (marcado) conjunto.add(atual.usuario.id)
      else conjunto.delete(atual.usuario.id)
      favoritos.set(id, conjunto)
      return HttpResponse.json({ anuncio_id: id, user_id: atual.usuario.id, is_favorited: marcado, favorites_count: conjunto.size })
    }),
  ]
}
