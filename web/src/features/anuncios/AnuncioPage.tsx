import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { BarChart3, Eye, Heart, MapPin, Pause, Pencil, Play, Scale, ShieldCheck, Trash2, Zap } from 'lucide-react'
import {
  useAlternarPausa,
  useAnuncio,
  useEditarAnuncio,
  useEstatisticas,
  useExcluirAnuncio,
  useImpulsionar,
  type Anuncio,
} from '@/api/anuncios'
import { useSessao } from '@/api/auth'
import { mensagemDeErro } from '@/api/erros'
import { ApiError } from '@/api/http'
import { CONDICOES, boostAtivo, categoria, centavosDe, preco, rotuloCondicao } from '@/lib/anuncios'
import { dataCurta, numeroInteiro } from '@/lib/formatar'
import { avisar } from '@/stores/avisos'
import { useComparador } from '@/stores/comparador'
import { MetaPagina } from '@/components/MetaPagina'
import { BotaoFavorito, MidiaAnuncio } from '@/components/anuncios/CartaoAnuncio'
import { Button } from '@/components/ui/Button'
import { CampoArea, CampoTexto, RotuloCampo, classeEntrada } from '@/components/ui/Campo'
import { CaixaInfo, Cartao, Etiqueta } from '@/components/ui/Exibicao'
import { Confirmacao, Modal } from '@/components/ui/Modal'
import { Carregando } from '@/components/ui/Spinner'

const DURACOES = [
  { horas: 24, moedas: 20 },
  { horas: 72, moedas: 50 },
  { horas: 168, moedas: 100 },
]

/** Impulsionar (tela 044): a chave de idempotência nasce ao abrir e vale para os retries (ADR-14). */
function DialogoImpulsionar({ anuncio, aberto, aoMudar }: { anuncio: Anuncio; aberto: boolean; aoMudar: (v: boolean) => void }) {
  const impulsionar = useImpulsionar(anuncio.id)
  const [escolha, setEscolha] = useState(0)
  const chave = useRef(crypto.randomUUID())
  const opcao = DURACOES[escolha] ?? DURACOES[0]!

  return (
    <Modal aberto={aberto} aoMudar={aoMudar} titulo="Impulsionar anúncio" descricao="O anúncio aparece primeiro no feed durante o período escolhido.">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-13 text-muted">Duração</legend>
        {DURACOES.map((d, i) => (
          <label key={d.horas} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-md border border-line bg-field px-4 has-checked:border-brand has-checked:bg-brand-subtle">
            <input
              type="radio"
              name="duracao"
              checked={escolha === i}
              onChange={() => {
                setEscolha(i)
                chave.current = crypto.randomUUID()
              }}
              className="size-4 accent-brand"
            />
            <span className="flex-1 text-14 font-semibold">{d.horas < 168 ? `${d.horas / 24} dia${d.horas > 24 ? 's' : ''}` : '7 dias'}</span>
            <span className="text-13 text-muted">{d.moedas} moedas</span>
          </label>
        ))}
      </fieldset>
      {impulsionar.isError && (
        <CaixaInfo tom="danger" role="alert">
          <span className="text-fg">{mensagemDeErro(impulsionar.error)}</span>
        </CaixaInfo>
      )}
      <Button
        full
        loading={impulsionar.isPending}
        icon={<Zap aria-hidden="true" className="size-4" />}
        onClick={() =>
          impulsionar.mutate(
            { duracao_horas: opcao.horas, moedas_custo: opcao.moedas, chave: chave.current },
            {
              onSuccess: (r) => {
                avisar(`Anúncio impulsionado até ${dataCurta(r.boost_active_until)}. ${r.moedas_debitadas} moedas usadas.`)
                chave.current = crypto.randomUUID()
                aoMudar(false)
              },
            },
          )
        }
      >
        Impulsionar por {opcao.moedas} moedas
      </Button>
    </Modal>
  )
}

/** Editar preço, título, condição e descrição (tela 008). */
function DialogoEditar({ anuncio, aberto, aoMudar }: { anuncio: Anuncio; aberto: boolean; aoMudar: (v: boolean) => void }) {
  const editar = useEditarAnuncio(anuncio.id)
  const [erro, setErro] = useState<string | null>(null)

  return (
    <Modal aberto={aberto} aoMudar={aoMudar} titulo="Editar anúncio">
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          const d = new FormData(e.currentTarget)
          const titulo = String(d.get('titulo') ?? '').trim()
          const centavos = centavosDe(String(d.get('preco') ?? ''))
          if (titulo.length < 3) return setErro('O título precisa de pelo menos 3 caracteres.')
          if (centavos === null) return setErro('Informe um preço válido.')
          setErro(null)
          editar.mutate(
            { titulo, preco_centavos: centavos, condicao: String(d.get('condicao')), descricao: String(d.get('descricao') ?? '').trim() || null },
            {
              onSuccess: () => {
                avisar('Anúncio atualizado.')
                aoMudar(false)
              },
              onError: (e2) => setErro(mensagemDeErro(e2)),
            },
          )
        }}
      >
        {erro && (
          <p role="alert" className="text-13 text-danger">
            {erro}
          </p>
        )}
        <CampoTexto label="Título" name="titulo" required defaultValue={anuncio.titulo} maxLength={150} />
        <CampoTexto label="Preço (R$)" name="preco" required inputMode="decimal" defaultValue={(anuncio.preco_centavos / 100).toFixed(2).replace('.', ',')} />
        <div className="flex flex-col gap-2">
          <RotuloCampo htmlFor="editar-condicao" label="Condição" />
          <select id="editar-condicao" name="condicao" defaultValue={anuncio.condicao} className={classeEntrada}>
            {CONDICOES.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.rotulo}
              </option>
            ))}
          </select>
        </div>
        <CampoArea label="Descrição" name="descricao" defaultValue={anuncio.descricao ?? ''} maxLength={4000} rows={4} />
        <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
          <Button variant="secondary" onClick={() => aoMudar(false)}>
            Cancelar
          </Button>
          <Button type="submit" loading={editar.isPending}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/** Ações de quem anunciou: pausar, reativar, impulsionar, estatísticas, editar e excluir (telas 008 a 011 e 044). */
function PainelDono({ anuncio }: { anuncio: Anuncio }) {
  const navigate = useNavigate()
  const pausa = useAlternarPausa(anuncio.id)
  const excluir = useExcluirAnuncio(anuncio.id)
  const [verEstatisticas, setVerEstatisticas] = useState(false)
  const estatisticas = useEstatisticas(anuncio.id, verEstatisticas)
  const [impulsionar, setImpulsionar] = useState(false)
  const [editar, setEditar] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const pausado = anuncio.status === 'PAUSADA'

  return (
    <Cartao className="flex flex-col gap-3 p-4">
      <h2 className="font-title text-16 font-medium">Seu anúncio</h2>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" size="sm" icon={<Pencil aria-hidden="true" className="size-4" />} onClick={() => setEditar(true)}>
          Editar
        </Button>
        <Button
          variant="secondary"
          size="sm"
          loading={pausa.isPending}
          icon={pausado ? <Play aria-hidden="true" className="size-4" /> : <Pause aria-hidden="true" className="size-4" />}
          onClick={() =>
            pausa.mutate(!pausado, {
              onSuccess: () => avisar(pausado ? 'Anúncio reativado.' : 'Anúncio pausado. Ele não aparece mais nas buscas.'),
              onError: (e) => avisar(mensagemDeErro(e), 'erro'),
            })
          }
        >
          {pausado ? 'Reativar' : 'Pausar'}
        </Button>
        <Button variant="secondary" size="sm" icon={<Zap aria-hidden="true" className="size-4" />} disabled={pausado} onClick={() => setImpulsionar(true)}>
          Impulsionar
        </Button>
        <Button
          variant="secondary"
          size="sm"
          aria-expanded={verEstatisticas}
          icon={<BarChart3 aria-hidden="true" className="size-4" />}
          onClick={() => setVerEstatisticas((v) => !v)}
        >
          Estatísticas
        </Button>
      </div>

      {verEstatisticas && (
        <div aria-live="polite" className="rounded-md border border-line bg-app p-3">
          {estatisticas.isPending ? (
            <p className="text-13 text-muted">Carregando…</p>
          ) : estatisticas.isError ? (
            <p className="text-13 text-danger">{mensagemDeErro(estatisticas.error)}</p>
          ) : (
            <dl className="grid grid-cols-2 gap-3 text-13">
              {[
                ['Visualizações', numeroInteiro(estatisticas.data.views_count)],
                ['Favoritos', numeroInteiro(estatisticas.data.favorites_count)],
                ['Fotos', numeroInteiro(estatisticas.data.fotos_count)],
                ['Impulso', estatisticas.data.boost_ativo && estatisticas.data.boost_active_until ? `até ${dataCurta(estatisticas.data.boost_active_until)}` : 'inativo'],
              ].map(([rotulo, valor]) => (
                <div key={rotulo}>
                  <dt className="text-11 font-medium text-muted">{rotulo}</dt>
                  <dd className="font-title text-16 font-bold">{valor}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}

      <Button variant="danger" size="sm" icon={<Trash2 aria-hidden="true" className="size-4" />} onClick={() => setConfirmarExclusao(true)}>
        Excluir anúncio
      </Button>

      <DialogoEditar anuncio={anuncio} aberto={editar} aoMudar={setEditar} />
      <DialogoImpulsionar anuncio={anuncio} aberto={impulsionar} aoMudar={setImpulsionar} />
      <Confirmacao
        aberto={confirmarExclusao}
        aoMudar={setConfirmarExclusao}
        titulo="Excluir este anúncio?"
        descricao="Ele sai do feed, das buscas e dos favoritos de quem salvou."
        confirmar="Excluir"
        perigo
        carregando={excluir.isPending}
        aoConfirmar={() =>
          excluir.mutate(undefined, {
            onSuccess: () => {
              avisar('Anúncio excluído.')
              navigate('/anuncios', { replace: true })
            },
            onError: (e) => avisar(mensagemDeErro(e), 'erro'),
            onSettled: () => setConfirmarExclusao(false),
          })
        }
      />
    </Cartao>
  )
}

/** Detalhe do anúncio (telas 001 a 019: destino do cartão do feed e da busca). */
export default function AnuncioPage() {
  const { id = '' } = useParams()
  const { data: usuario } = useSessao()
  const { data: anuncio, isPending, isError, error } = useAnuncio(id)
  const { ids, alternar } = useComparador()

  if (isPending) return <Carregando texto="Carregando anúncio…" />
  if (isError) {
    const naoExiste = error instanceof ApiError && error.status === 404
    return (
      <div className="mx-auto flex max-w-xl flex-col items-start gap-4 py-10">
        <MetaPagina titulo="Anúncio não encontrado" privada />
        <h1 className="font-title text-24 font-bold">{naoExiste ? 'Anúncio não encontrado' : 'Não foi possível abrir o anúncio'}</h1>
        <p className="text-15 text-muted">{naoExiste ? 'Ele pode ter sido vendido, pausado ou excluído.' : mensagemDeErro(error)}</p>
        <Button asChild>
          <Link to="/buscar">Buscar outras peças</Link>
        </Button>
      </div>
    )
  }

  const dono = usuario?.id === anuncio.seller_id
  const comparando = ids.includes(anuncio.id)
  const specs = Object.entries(anuncio.specs ?? {})
  const cat = categoria(anuncio.categoria)

  return (
    <article className="flex flex-col gap-6">
      <MetaPagina titulo={anuncio.titulo} descricao={`${anuncio.titulo} por ${preco(anuncio.preco_centavos)} em ${anuncio.cidade} – ${anuncio.estado}.`} />
      <nav aria-label="Caminho" className="text-13 text-muted">
        <Link to="/buscar" className="hover:text-fg hover:underline">
          Buscar
        </Link>{' '}
        / {cat.rotulo}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_24rem] lg:items-start">
        <div className="flex flex-col gap-6">
          <div className="relative overflow-hidden rounded-lg border border-line">
            <MidiaAnuncio categoria={anuncio.categoria} grande className="h-64 md:h-96" />
            {boostAtivo(anuncio.boost_active_until) && (
              <Etiqueta className="absolute left-3 top-3" icon={<Zap className="size-3" />}>
                Impulsionado
              </Etiqueta>
            )}
            <p className="absolute bottom-3 left-3 rounded-full bg-overlay px-3 py-1 text-11 font-medium text-muted">
              {anuncio.fotos?.length ?? 0} {anuncio.fotos?.length === 1 ? 'foto' : 'fotos'} sem metadados de localização
            </p>
          </div>

          {anuncio.descricao && (
            <section aria-labelledby="titulo-descricao" className="flex flex-col gap-2">
              <h2 id="titulo-descricao" className="font-title text-18 font-bold">
                Descrição
              </h2>
              <p className="whitespace-pre-line text-15 text-muted">{anuncio.descricao}</p>
            </section>
          )}

          <section aria-labelledby="titulo-specs" className="flex flex-col gap-2">
            <h2 id="titulo-specs" className="font-title text-18 font-bold">
              Especificações
            </h2>
            {specs.length === 0 ? (
              <p className="text-14 text-muted">Quem anunciou não informou especificações.</p>
            ) : (
              <Cartao className="overflow-hidden">
                <table className="w-full text-14">
                  <caption className="sr-only">Especificações técnicas</caption>
                  <tbody className="divide-y divide-line">
                    {specs.map(([chave, valor]) => (
                      <tr key={chave}>
                        <th scope="row" className="w-2/5 px-4 py-3 text-left font-medium text-muted">
                          {chave}
                        </th>
                        <td className="px-4 py-3">{valor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Cartao>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
          <Cartao className="flex flex-col gap-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <h1 className="font-title text-20 font-bold">{anuncio.titulo}</h1>
              <BotaoFavorito anuncio={anuncio} className="shrink-0 border border-line" />
            </div>
            <p className="font-title text-24 font-bold text-brand">{preco(anuncio.preco_centavos)}</p>
            <div className="flex flex-wrap gap-2">
              <Etiqueta tom="muted">{rotuloCondicao(anuncio.condicao)}</Etiqueta>
              <Etiqueta tom="muted">{cat.rotulo}</Etiqueta>
              {anuncio.marca && <Etiqueta tom="muted">{anuncio.marca}</Etiqueta>}
              {anuncio.status === 'PAUSADA' && <Etiqueta tom="danger">Pausado</Etiqueta>}
            </div>
            {anuncio.modelo_ou_sku && <p className="text-13 text-muted">Modelo: {anuncio.modelo_ou_sku}</p>}
            <p className="flex items-center gap-1.5 text-13 text-muted">
              <MapPin aria-hidden="true" className="size-4 text-icon" />
              {anuncio.bairro_aproximado ? `${anuncio.bairro_aproximado}, ` : ''}
              {anuncio.cidade} – {anuncio.estado}
            </p>
            <p className="flex items-center gap-4 text-13 text-muted">
              <span className="flex items-center gap-1.5">
                <Eye aria-hidden="true" className="size-4 text-icon" /> {numeroInteiro(anuncio.views_count)} visualizações
              </span>
              <span className="flex items-center gap-1.5">
                <Heart aria-hidden="true" className="size-4 text-icon" /> {numeroInteiro(anuncio.favorites_count)} favoritos
              </span>
            </p>
            <Button
              variant="secondary"
              aria-pressed={comparando}
              icon={<Scale aria-hidden="true" className="size-4" />}
              onClick={() => {
                const r = alternar(anuncio.id)
                if (r === 'cheio') avisar('Você já escolheu 4 anúncios para comparar.', 'erro')
                else avisar(r === 'adicionado' ? 'Adicionado ao comparador.' : 'Removido do comparador.')
              }}
            >
              {comparando ? 'No comparador' : 'Comparar'}
            </Button>
            {ids.length >= 2 && (
              <Link to="/comparar" className="text-center text-13 font-semibold text-brand hover:underline">
                Ver comparação ({ids.length})
              </Link>
            )}
          </Cartao>

          <CaixaInfo icon={<ShieldCheck className="size-4" />}>
            Pague pelo Steely: o valor fica retido até a entrega ser confirmada por QR Code. Endereço e telefone nunca aparecem no anúncio.
          </CaixaInfo>

          {dono && <PainelDono anuncio={anuncio} />}
        </aside>
      </div>
    </article>
  )
}
