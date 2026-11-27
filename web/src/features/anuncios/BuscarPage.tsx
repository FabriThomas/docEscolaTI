import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { LocateFixed, Search, SlidersHorizontal } from 'lucide-react'
import { useBusca, type FiltrosBusca } from '@/api/anuncios'
import { CATEGORIAS, CIDADES_REFERENCIA, CONDICOES, centavosDe } from '@/lib/anuncios'
import { cn } from '@/lib/cn'
import { MetaPagina } from '@/components/MetaPagina'
import { GradeAnuncios } from '@/components/anuncios/CartaoAnuncio'
import { Button } from '@/components/ui/Button'
import { RotuloCampo, classeEntrada } from '@/components/ui/Campo'

const RAIOS = [5, 10, 25, 50, 100, 250]

function lerFiltros(params: URLSearchParams): FiltrosBusca {
  const numero = (chave: string) => {
    const v = params.get(chave)
    return v === null || v === '' || Number.isNaN(Number(v)) ? undefined : Number(v)
  }
  return {
    q: params.get('q') || undefined,
    categoria: params.get('categoria') || undefined,
    condicao: params.get('condicao') || undefined,
    preco_min_centavos: numero('min'),
    preco_max_centavos: numero('max'),
    lat: numero('lat'),
    lon: numero('lon'),
    raio_km: numero('raio') ?? (params.get('lat') ? 25 : undefined),
  }
}

/** Telas 015 a 019 · Resultado de busca e filtro por localização (STY020; busca por raio da EDTS-373). */
export default function BuscarPage() {
  const [params, setParams] = useSearchParams()
  const filtros = lerFiltros(params)
  const busca = useBusca(filtros)
  const [localizando, setLocalizando] = useState(false)
  const [erroLocal, setErroLocal] = useState<string | null>(null)

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const dados = new FormData(e.currentTarget)
    const novo = new URLSearchParams()
    const texto = String(dados.get('q') ?? '').trim()
    if (texto) novo.set('q', texto)
    for (const chave of ['categoria', 'condicao', 'raio'] as const) {
      const v = String(dados.get(chave) ?? '')
      if (v) novo.set(chave, v)
    }
    const min = centavosDe(String(dados.get('min') ?? ''))
    const max = centavosDe(String(dados.get('max') ?? ''))
    if (min !== null) novo.set('min', String(min))
    if (max !== null) novo.set('max', String(max))
    const cidade = CIDADES_REFERENCIA.find((c) => c.nome === dados.get('cidade'))
    if (cidade) {
      novo.set('lat', String(cidade.lat))
      novo.set('lon', String(cidade.lon))
    } else if (params.get('lat') && dados.get('cidade') === 'atual') {
      novo.set('lat', params.get('lat') as string)
      novo.set('lon', params.get('lon') as string)
    }
    setParams(novo)
  }

  function usarMinhaLocalizacao() {
    if (!('geolocation' in navigator)) return setErroLocal('Seu navegador não informa a localização. Escolha uma cidade.')
    setLocalizando(true)
    setErroLocal(null)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocalizando(false)
        const novo = new URLSearchParams(params)
        novo.set('lat', coords.latitude.toFixed(4))
        novo.set('lon', coords.longitude.toFixed(4))
        if (!novo.get('raio')) novo.set('raio', '25')
        setParams(novo)
      },
      () => {
        setLocalizando(false)
        setErroLocal('Não foi possível usar sua localização. Escolha uma cidade.')
      },
      { timeout: 10_000 },
    )
  }

  const temLocal = filtros.lat !== undefined && filtros.lon !== undefined
  const cidadeAtual = CIDADES_REFERENCIA.find((c) => c.lat === filtros.lat && c.lon === filtros.lon)?.nome ?? (temLocal ? 'atual' : '')
  const total = busca.data?.length ?? 0

  return (
    <div className="flex flex-col gap-6">
      <MetaPagina titulo="Buscar" descricao="Busque placas de vídeo, processadores, memórias e mais peças reaproveitáveis perto de você." />
      <header className="flex flex-col gap-1">
        <h1 className="font-title text-24 font-bold">Buscar</h1>
        <p className="text-14 text-muted">Encontre peças por nome, categoria, preço e distância.</p>
      </header>

      <form onSubmit={enviar} className="flex flex-col gap-4 rounded-md border border-line bg-surface p-4" key={params.toString()}>
        <div className="relative">
          <label htmlFor="busca-q" className="sr-only">
            O que você procura
          </label>
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-icon" />
          <input id="busca-q" name="q" type="search" defaultValue={filtros.q} placeholder="Ex.: RTX 3060, Ryzen 5, DDR4 16 GB" className={cn(classeEntrada, 'pl-11')} />
        </div>

        <fieldset className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <legend className="mb-2 flex items-center gap-2 text-13 font-semibold">
            <SlidersHorizontal aria-hidden="true" className="size-4 text-icon" /> Filtros
          </legend>
          <div className="flex flex-col gap-2">
            <RotuloCampo htmlFor="busca-categoria" label="Categoria" />
            <select id="busca-categoria" name="categoria" defaultValue={filtros.categoria ?? ''} className={classeEntrada}>
              <option value="">Todas</option>
              {CATEGORIAS.map((c) => (
                <option key={c.valor} value={c.valor}>
                  {c.rotulo}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <RotuloCampo htmlFor="busca-condicao" label="Condição" />
            <select id="busca-condicao" name="condicao" defaultValue={filtros.condicao ?? ''} className={classeEntrada}>
              <option value="">Qualquer</option>
              {CONDICOES.map((c) => (
                <option key={c.valor} value={c.valor}>
                  {c.rotulo}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <RotuloCampo htmlFor="busca-min" label="Preço mínimo (R$)" />
              <input id="busca-min" name="min" inputMode="decimal" defaultValue={filtros.preco_min_centavos != null ? filtros.preco_min_centavos / 100 : ''} className={classeEntrada} />
            </div>
            <div className="flex flex-col gap-2">
              <RotuloCampo htmlFor="busca-max" label="Preço máximo (R$)" />
              <input id="busca-max" name="max" inputMode="decimal" defaultValue={filtros.preco_max_centavos != null ? filtros.preco_max_centavos / 100 : ''} className={classeEntrada} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <RotuloCampo htmlFor="busca-cidade" label="Perto de" />
              <select id="busca-cidade" name="cidade" defaultValue={cidadeAtual} className={classeEntrada}>
                <option value="">Qualquer lugar</option>
                {temLocal && !CIDADES_REFERENCIA.some((c) => c.nome === cidadeAtual) && <option value="atual">Minha localização</option>}
                {CIDADES_REFERENCIA.map((c) => (
                  <option key={c.nome} value={c.nome}>
                    {c.nome} – {c.uf}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <RotuloCampo htmlFor="busca-raio" label="Raio" />
              <select id="busca-raio" name="raio" defaultValue={String(filtros.raio_km ?? 25)} className={classeEntrada}>
                {RAIOS.map((r) => (
                  <option key={r} value={r}>
                    {r} km
                  </option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" icon={<Search aria-hidden="true" className="size-4" />}>
            Buscar
          </Button>
          <Button variant="secondary" loading={localizando} icon={<LocateFixed aria-hidden="true" className="size-4" />} onClick={usarMinhaLocalizacao}>
            Usar minha localização
          </Button>
          {params.toString() && (
            <Button variant="ghost" onClick={() => setParams(new URLSearchParams())}>
              Limpar filtros
            </Button>
          )}
        </div>
        {erroLocal && (
          <p role="alert" className="text-13 text-danger">
            {erroLocal}
          </p>
        )}
      </form>

      <section aria-labelledby="titulo-resultados" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="titulo-resultados" className="font-title text-18 font-bold">
            Resultados
          </h2>
          {!busca.isPending && !busca.isError && (
            <p aria-live="polite" className="text-13 text-muted">
              {total} {total === 1 ? 'anúncio encontrado' : 'anúncios encontrados'}
              {temLocal ? ` em até ${filtros.raio_km} km` : ''}
            </p>
          )}
        </div>
        <GradeAnuncios
          anuncios={busca.data}
          carregando={busca.isPending}
          erro={busca.error}
          aoTentarDeNovo={() => busca.refetch()}
          vazio="Nenhum anúncio com esses filtros. Tente aumentar o raio ou tirar algum filtro."
        />
      </section>
    </div>
  )
}
