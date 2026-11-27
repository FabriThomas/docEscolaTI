import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { ChevronLeft, ImagePlus, Info, LocateFixed, Plus, Trash2, X, Zap } from 'lucide-react'
import { useCriarAnuncio, type NovoAnuncio } from '@/api/anuncios'
import { mensagemDeErro } from '@/api/erros'
import { ApiError } from '@/api/http'
import { CATEGORIAS, CIDADES_REFERENCIA, CONDICOES, categoria, centavosDe, preco, rotuloCondicao } from '@/lib/anuncios'
import { cn } from '@/lib/cn'
import { avisar } from '@/stores/avisos'
import { MetaPagina } from '@/components/MetaPagina'
import { Button } from '@/components/ui/Button'
import { CampoArea, CampoTexto, RotuloCampo, classeEntrada } from '@/components/ui/Campo'
import { CaixaInfo, Cartao } from '@/components/ui/Exibicao'
import { CaixaSelecao } from '@/components/ui/Selecao'

const ETAPAS = ['Fotos', 'Detalhes', 'Preço e local', 'Revisão'] as const
const MAX_FOTOS = 6
const MAX_BYTES_FOTO = 10 * 1024 * 1024
const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp']

type Spec = { chave: string; valor: string }
type Rascunho = {
  fotos: File[]
  titulo: string
  categoria: string
  marca: string
  modelo: string
  condicao: string
  descricao: string
  specs: Spec[]
  preco: string
  cidade: string
  estado: string
  bairro: string
  lat: number | null
  lon: number | null
  ciente: boolean
}

const vazio: Rascunho = {
  fotos: [],
  titulo: '',
  categoria: '',
  marca: '',
  modelo: '',
  condicao: 'USADO',
  descricao: '',
  specs: [{ chave: '', valor: '' }],
  preco: '',
  cidade: '',
  estado: '',
  bairro: '',
  lat: null,
  lon: null,
  ciente: false,
}

/** Validação de cada etapa (STY016; limites do backend EDTS-373). */
function errosDaEtapa(etapa: number, r: Rascunho): Record<string, string> {
  const e: Record<string, string> = {}
  if (etapa === 0 && r.fotos.length === 0) e.fotos = 'Adicione pelo menos uma foto da peça.'
  if (etapa === 1) {
    if (r.titulo.trim().length < 3) e.titulo = 'Use pelo menos 3 caracteres.'
    if (!r.categoria) e.categoria = 'Escolha a categoria.'
    if (r.condicao === 'DEFEITO_SUCATA' && r.descricao.trim().length < 10) e.descricao = 'Descreva o defeito (STY016-RN04).'
  }
  if (etapa === 2) {
    const centavos = centavosDe(r.preco)
    if (centavos === null || centavos <= 0) e.preco = 'Informe o preço em reais.'
    if (r.cidade.trim().length < 2) e.cidade = 'Informe a cidade.'
    if (!/^[A-Za-z]{2}$/.test(r.estado.trim())) e.estado = 'Use a sigla do estado, ex.: PR.'
    if (r.lat === null || r.lon === null) e.local = 'Use sua localização ou escolha uma cidade de referência.'
  }
  if (etapa === 3 && !r.ciente) e.ciente = 'Confirme que as informações são verdadeiras.'
  return e
}

function Etapas({ atual }: { atual: number }) {
  return (
    <div className="flex flex-col gap-2">
      <div aria-hidden="true" className="grid grid-cols-4 gap-1.5">
        {ETAPAS.map((n, i) => (
          <span key={n} className={cn('h-1 rounded-full', i <= atual ? 'bg-brand' : 'bg-raised')} />
        ))}
      </div>
      <ol aria-label="Etapas do anúncio" className="grid grid-cols-4 gap-1.5">
        {ETAPAS.map((n, i) => (
          <li key={n} aria-current={i === atual ? 'step' : undefined} className={cn('text-11 font-medium', i === atual ? 'text-brand' : i < atual ? 'text-fg' : 'text-muted')}>
            <span className="sr-only">Etapa {i + 1} de 4: </span>
            {n}
          </li>
        ))}
      </ol>
    </div>
  )
}

/** Telas 003 a 006 · Criar anúncio (STY016). As fotos viram WebP sem EXIF no servidor (ADR-11). */
export default function AnunciarPage() {
  const navigate = useNavigate()
  const criar = useCriarAnuncio()
  const [etapa, setEtapa] = useState(0)
  const [r, setR] = useState<Rascunho>(vazio)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [localizando, setLocalizando] = useState(false)
  const entradaFotos = useRef<HTMLInputElement>(null)
  const titulo = useRef<HTMLHeadingElement>(null)

  const previas = useMemo(() => r.fotos.map((f) => URL.createObjectURL(f)), [r.fotos])
  useEffect(() => () => previas.forEach((u) => URL.revokeObjectURL(u)), [previas])
  useEffect(() => titulo.current?.focus(), [etapa])

  const atualizar = <K extends keyof Rascunho>(campo: K, valor: Rascunho[K]) => setR((atual) => ({ ...atual, [campo]: valor }))

  function adicionarFotos(lista: FileList | null) {
    if (!lista) return
    const novas: File[] = []
    for (const f of Array.from(lista)) {
      if (!TIPOS_FOTO.includes(f.type)) return setErros({ fotos: 'Use fotos JPG, PNG ou WebP.' })
      if (f.size > MAX_BYTES_FOTO) return setErros({ fotos: 'Cada foto pode ter até 10 MB.' })
      novas.push(f)
    }
    const total = [...r.fotos, ...novas]
    if (total.length > MAX_FOTOS) return setErros({ fotos: `Máximo de ${MAX_FOTOS} fotos por anúncio.` })
    setErros({})
    atualizar('fotos', total)
  }

  function avancar() {
    const e = errosDaEtapa(etapa, r)
    setErros(e)
    if (Object.keys(e).length) return
    if (etapa < 3) return setEtapa(etapa + 1)

    const dados: NovoAnuncio = {
      titulo: r.titulo.trim(),
      descricao: r.descricao.trim() || null,
      categoria: r.categoria,
      marca: r.marca.trim() || null,
      modelo_ou_sku: r.modelo.trim() || null,
      condicao: r.condicao,
      preco_centavos: centavosDe(r.preco) ?? 0,
      bairro_aproximado: r.bairro.trim() || null,
      cidade: r.cidade.trim(),
      estado: r.estado.trim().toUpperCase(),
      latitude: r.lat ?? 0,
      longitude: r.lon ?? 0,
      specs: Object.fromEntries(r.specs.filter((s) => s.chave.trim() && s.valor.trim()).map((s) => [s.chave.trim(), s.valor.trim()])),
    }
    criar.mutate(
      { dados, fotos: r.fotos },
      {
        onSuccess: (anuncio) => {
          avisar('Anúncio publicado!')
          navigate(`/anuncios/${anuncio.id}`, { replace: true })
        },
      },
    )
  }

  function usarLocalizacao() {
    if (!('geolocation' in navigator)) return setErros({ local: 'Seu navegador não informa a localização. Escolha uma cidade.' })
    setLocalizando(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocalizando(false)
        setR((a) => ({ ...a, lat: coords.latitude, lon: coords.longitude }))
        setErros({})
      },
      () => {
        setLocalizando(false)
        setErros({ local: 'Não foi possível usar sua localização. Escolha uma cidade.' })
      },
      { timeout: 10_000 },
    )
  }

  const cat = r.categoria ? categoria(r.categoria) : null

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <MetaPagina titulo="Anunciar" privada />
      <header className="flex flex-col gap-4">
        <h1 ref={titulo} tabIndex={-1} className="font-title text-24 font-bold outline-none">
          Criar anúncio · {ETAPAS[etapa]}
        </h1>
        <Etapas atual={etapa} />
      </header>

      <Cartao className="flex flex-col gap-5 p-5 md:p-6">
        {etapa === 0 && (
          <>
            <p className="text-14 text-muted">Até 6 fotos. A primeira vira a capa. Removemos a localização e outros metadados das imagens.</p>
            <ul aria-label="Fotos escolhidas" className="grid grid-cols-3 gap-3">
              {r.fotos.map((f, i) => (
                <li key={`${f.name}-${i}`} className="relative aspect-square overflow-hidden rounded-md border border-line bg-raised">
                  <img src={previas[i]} alt={`Foto ${i + 1}${i === 0 ? ' (capa)' : ''}`} className="size-full object-cover" />
                  {i === 0 && <span className="absolute bottom-2 left-2 rounded-full bg-overlay px-2 py-0.5 text-11 font-medium text-brand">Capa</span>}
                  <button
                    type="button"
                    aria-label={`Remover foto ${i + 1}`}
                    onClick={() => atualizar('fotos', r.fotos.filter((_, j) => j !== i))}
                    className="touch-target absolute right-0 top-0 flex items-center justify-center text-fg"
                  >
                    <span className="flex size-7 items-center justify-center rounded-full bg-overlay">
                      <X aria-hidden="true" className="size-4" />
                    </span>
                  </button>
                </li>
              ))}
              {r.fotos.length < MAX_FOTOS && (
                <li>
                  <button
                    type="button"
                    onClick={() => entradaFotos.current?.click()}
                    aria-describedby={erros.fotos ? 'erro-fotos' : undefined}
                    className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-brand bg-brand-subtle text-13 font-semibold text-brand"
                  >
                    <ImagePlus aria-hidden="true" className="size-6" />
                    Adicionar fotos
                  </button>
                </li>
              )}
            </ul>
            <input
              ref={entradaFotos}
              type="file"
              accept={TIPOS_FOTO.join(',')}
              multiple
              tabIndex={-1}
              aria-label="Escolher fotos da peça"
              className="sr-only"
              onChange={(e) => {
                adicionarFotos(e.target.files)
                e.target.value = ''
              }}
            />
            {erros.fotos && (
              <p id="erro-fotos" role="alert" className="text-13 text-danger">
                {erros.fotos}
              </p>
            )}
            <CaixaInfo icon={<Info className="size-4" />}>Fotografe a peça inteira, a etiqueta com o modelo e, se houver, o defeito.</CaixaInfo>
          </>
        )}

        {etapa === 1 && (
          <>
            <CampoTexto label="Título" required maxLength={150} placeholder="Ex.: RTX 3060 Ti 8 GB ASUS Dual" value={r.titulo} onChange={(e) => atualizar('titulo', e.target.value)} error={erros.titulo} />
            <div className="flex flex-col gap-2">
              <RotuloCampo htmlFor="anunciar-categoria" label="Categoria" required />
              <select
                id="anunciar-categoria"
                value={r.categoria}
                onChange={(e) => atualizar('categoria', e.target.value)}
                aria-invalid={erros.categoria ? true : undefined}
                aria-describedby={erros.categoria ? 'erro-categoria' : undefined}
                className={classeEntrada}
              >
                <option value="">Escolha</option>
                {CATEGORIAS.map((c) => (
                  <option key={c.valor} value={c.valor}>
                    {c.rotulo}
                  </option>
                ))}
              </select>
              {erros.categoria && (
                <p id="erro-categoria" className="text-13 text-danger">
                  {erros.categoria}
                </p>
              )}
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <CampoTexto label="Marca" maxLength={80} value={r.marca} onChange={(e) => atualizar('marca', e.target.value)} />
              <CampoTexto label="Modelo ou SKU" maxLength={120} value={r.modelo} onChange={(e) => atualizar('modelo', e.target.value)} />
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-13 text-muted">Condição</legend>
              <div className="grid grid-cols-2 gap-2">
                {CONDICOES.map((c) => (
                  <label key={c.valor} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-line bg-field px-3 text-14 has-checked:border-brand has-checked:bg-brand-subtle">
                    <input type="radio" name="condicao" value={c.valor} checked={r.condicao === c.valor} onChange={() => atualizar('condicao', c.valor)} className="size-4 accent-brand" />
                    {c.rotulo}
                  </label>
                ))}
              </div>
            </fieldset>
            <CampoArea
              label="Descrição"
              required={r.condicao === 'DEFEITO_SUCATA'}
              maxLength={4000}
              rows={4}
              value={r.descricao}
              onChange={(e) => atualizar('descricao', e.target.value)}
              error={erros.descricao}
              hint="Não coloque telefone, e-mail ou endereço: a moderação remove dados de contato."
            />
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-2 text-13 text-muted">Especificações (opcional)</legend>
              {r.specs.map((s, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                  <CampoTexto label={`Item ${i + 1}`} placeholder="Ex.: VRAM" value={s.chave} onChange={(e) => atualizar('specs', r.specs.map((x, j) => (j === i ? { ...x, chave: e.target.value } : x)))} />
                  <CampoTexto label={`Valor ${i + 1}`} placeholder="Ex.: 8 GB GDDR6" value={s.valor} onChange={(e) => atualizar('specs', r.specs.map((x, j) => (j === i ? { ...x, valor: e.target.value } : x)))} />
                  <button
                    type="button"
                    aria-label={`Remover especificação ${i + 1}`}
                    onClick={() => atualizar('specs', r.specs.length > 1 ? r.specs.filter((_, j) => j !== i) : [{ chave: '', valor: '' }])}
                    className="touch-target flex items-center justify-center rounded-md text-icon hover:text-danger"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                </div>
              ))}
              {r.specs.length < 8 && (
                <Button variant="ghost" className="self-start text-13" icon={<Plus aria-hidden="true" className="size-4" />} onClick={() => atualizar('specs', [...r.specs, { chave: '', valor: '' }])}>
                  Adicionar especificação
                </Button>
              )}
            </fieldset>
          </>
        )}

        {etapa === 2 && (
          <>
            <CampoTexto label="Preço (R$)" required inputMode="decimal" placeholder="0,00" value={r.preco} onChange={(e) => atualizar('preco', e.target.value)} error={erros.preco} />
            <div className="grid grid-cols-[1fr_6rem] gap-3">
              <CampoTexto label="Cidade" required value={r.cidade} onChange={(e) => atualizar('cidade', e.target.value)} error={erros.cidade} />
              <CampoTexto label="UF" required maxLength={2} value={r.estado} onChange={(e) => atualizar('estado', e.target.value.toUpperCase())} error={erros.estado} />
            </div>
            <CampoTexto label="Bairro" value={r.bairro} onChange={(e) => atualizar('bairro', e.target.value)} hint="Só o bairro aparece. O endereço nunca fica público." />
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-2 text-13 text-muted">Localização aproximada (para a busca por distância)</legend>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" loading={localizando} icon={<LocateFixed aria-hidden="true" className="size-4" />} onClick={usarLocalizacao}>
                  Usar minha localização
                </Button>
                {CIDADES_REFERENCIA.map((c) => (
                  <Button
                    key={c.nome}
                    variant="secondary"
                    size="sm"
                    aria-pressed={r.lat === c.lat && r.lon === c.lon}
                    className="aria-pressed:border-brand aria-pressed:text-brand"
                    onClick={() => setR((a) => ({ ...a, lat: c.lat, lon: c.lon, cidade: a.cidade || c.nome, estado: a.estado || c.uf }))}
                  >
                    {c.nome} – {c.uf}
                  </Button>
                ))}
              </div>
              <p aria-live="polite" className={cn('text-13', erros.local ? 'text-danger' : 'text-muted')}>
                {erros.local ?? (r.lat !== null ? 'Localização definida. Quem busca vê só uma posição aproximada.' : 'Nenhuma localização escolhida.')}
              </p>
            </fieldset>
          </>
        )}

        {etapa === 3 && (
          <>
            <dl className="grid gap-3 text-14 md:grid-cols-2">
              {[
                ['Título', r.titulo],
                ['Categoria', cat?.rotulo ?? ''],
                ['Condição', rotuloCondicao(r.condicao)],
                ['Preço', preco(centavosDe(r.preco) ?? 0)],
                ['Local', `${r.bairro ? `${r.bairro}, ` : ''}${r.cidade} – ${r.estado}`],
                ['Fotos', `${r.fotos.length} de ${MAX_FOTOS}`],
              ].map(([rotulo, valor]) => (
                <div key={rotulo} className="flex flex-col gap-0.5">
                  <dt className="text-11 font-medium text-muted">{rotulo}</dt>
                  <dd>{valor}</dd>
                </div>
              ))}
            </dl>
            <CaixaSelecao checked={r.ciente} onCheckedChange={(v) => atualizar('ciente', v)} error={erros.ciente}>
              Confirmo que as informações e fotos são verdadeiras. Sou responsável pelo anúncio, mesmo com sugestões da IA (STY016-RN10).
            </CaixaSelecao>
            {criar.isError && (
              <CaixaInfo tom="danger" role="alert">
                <span className="text-fg">
                  {criar.error instanceof ApiError && criar.error.status === 401 ? 'Sua sessão expirou. Entre de novo para publicar.' : mensagemDeErro(criar.error, 'Não foi possível publicar.')}
                </span>
              </CaixaInfo>
            )}
          </>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 md:flex-row md:justify-between">
          <Button variant="secondary" icon={<ChevronLeft aria-hidden="true" className="size-4" />} disabled={etapa === 0 || criar.isPending} onClick={() => setEtapa(etapa - 1)}>
            Voltar
          </Button>
          <Button loading={criar.isPending} icon={etapa === 3 ? <Zap aria-hidden="true" className="size-4" /> : undefined} onClick={avancar}>
            {etapa === 3 ? 'Publicar anúncio' : 'Continuar'}
          </Button>
        </div>
      </Cartao>
    </div>
  )
}
