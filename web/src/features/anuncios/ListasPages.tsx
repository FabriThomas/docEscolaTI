import { Link } from 'react-router'
import { Plus, Scale, X } from 'lucide-react'
import { useComparacao, useFeed, useMeusFavoritos } from '@/api/anuncios'
import { useSessao } from '@/api/auth'
import { mensagemDeErro } from '@/api/erros'
import { preco, rotuloCondicao } from '@/lib/anuncios'
import { useComparador } from '@/stores/comparador'
import { MetaPagina } from '@/components/MetaPagina'
import { GradeAnuncios } from '@/components/anuncios/CartaoAnuncio'
import { Button } from '@/components/ui/Button'
import { CaixaInfo, Cartao } from '@/components/ui/Exibicao'
import { Carregando } from '@/components/ui/Spinner'

/** Tela 012 · Anúncios favoritos. */
export function FavoritosPage() {
  const favoritos = useMeusFavoritos()
  return (
    <div className="flex flex-col gap-6">
      <MetaPagina titulo="Favoritos" privada />
      <header className="flex flex-col gap-1">
        <h1 className="font-title text-24 font-bold">Favoritos</h1>
        <p className="text-14 text-muted">Anúncios que você salvou para ver depois.</p>
      </header>
      <GradeAnuncios
        anuncios={favoritos.data}
        carregando={favoritos.isPending}
        erro={favoritos.error}
        aoTentarDeNovo={() => favoritos.refetch()}
        vazio={
          <>
            Você ainda não favoritou nenhum anúncio.{' '}
            <Link to="/buscar" className="font-semibold text-brand hover:underline">
              Buscar peças
            </Link>
          </>
        }
      />
    </div>
  )
}

/** Tela 013 · Comparar anúncios (2 a 4, matriz de especificações do backend). */
export function CompararPage() {
  const { ids, alternar, limpar } = useComparador()
  const comparacao = useComparacao(ids)

  return (
    <div className="flex flex-col gap-6">
      <MetaPagina titulo="Comparar anúncios" privada />
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-title text-24 font-bold">Comparar anúncios</h1>
          <p className="text-14 text-muted">Escolha de 2 a 4 anúncios com o botão Comparar, na página de cada um.</p>
        </div>
        {ids.length > 0 && (
          <Button variant="ghost" onClick={limpar}>
            Limpar comparação
          </Button>
        )}
      </header>

      {ids.length < 2 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-line p-8 text-center">
          <Scale aria-hidden="true" className="size-8 text-icon" />
          <p className="text-14 text-muted">{ids.length === 1 ? 'Falta escolher mais um anúncio.' : 'Nenhum anúncio escolhido ainda.'}</p>
          <Button asChild variant="secondary" size="sm">
            <Link to="/buscar">
              <Plus aria-hidden="true" className="size-4" /> Escolher anúncios
            </Link>
          </Button>
        </div>
      ) : comparacao.isPending ? (
        <Carregando texto="Comparando…" />
      ) : comparacao.isError ? (
        <CaixaInfo tom="danger" role="alert">
          <span className="text-fg">{mensagemDeErro(comparacao.error, 'Não foi possível comparar.')}</span>
        </CaixaInfo>
      ) : (
        <Cartao className="overflow-x-auto">
          <table className="w-full min-w-xl text-14">
            <caption className="sr-only">Comparação de especificações</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="w-48 px-4 py-3 text-left text-13 font-semibold text-muted">
                  Anúncio
                </th>
                {comparacao.data.anuncios.map((a) => (
                  <th key={a.id} scope="col" className="px-4 py-3 text-left align-top">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/anuncios/${a.id}`} className="text-13 font-semibold hover:underline">
                        {a.titulo}
                      </Link>
                      <button
                        type="button"
                        aria-label={`Tirar ${a.titulo} da comparação`}
                        onClick={() => alternar(a.id)}
                        className="touch-target -m-2 flex items-center justify-center text-icon hover:text-fg"
                      >
                        <X aria-hidden="true" className="size-4" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              <tr>
                <th scope="row" className="px-4 py-3 text-left font-medium text-muted">
                  Preço
                </th>
                {comparacao.data.anuncios.map((a) => (
                  <td key={a.id} className="px-4 py-3 font-title font-bold text-brand">
                    {preco(a.preco_centavos)}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className="px-4 py-3 text-left font-medium text-muted">
                  Condição
                </th>
                {comparacao.data.anuncios.map((a) => (
                  <td key={a.id} className="px-4 py-3">
                    {rotuloCondicao(a.condicao)}
                  </td>
                ))}
              </tr>
              {comparacao.data.spec_keys.map((chave) => (
                <tr key={chave}>
                  <th scope="row" className="px-4 py-3 text-left font-medium text-muted">
                    {chave}
                  </th>
                  {comparacao.data.anuncios.map((a) => (
                    <td key={a.id} className="px-4 py-3">
                      {comparacao.data.specs_matrix[chave]?.[a.id] ?? <span className="text-muted">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Cartao>
      )}
    </div>
  )
}

/**
 * Tela 007 · Meus anúncios. O backend (EDTS-373) ainda não tem rota própria para isso: aqui
 * aparecem os anúncios ativos do feed que são seus. Pausados ficam fora até essa rota existir.
 */
export function MeusAnunciosPage() {
  const { data: usuario } = useSessao()
  const feed = useFeed()
  const todos = feed.data?.pages.flatMap((p) => p.items) ?? []
  const meus = todos.filter((a) => a.seller_id === usuario?.id)

  return (
    <div className="flex flex-col gap-6">
      <MetaPagina titulo="Meus anúncios" privada />
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-title text-24 font-bold">Meus anúncios</h1>
          <p className="text-14 text-muted">Abra um anúncio para pausar, impulsionar, editar ou ver estatísticas.</p>
        </div>
        <Button asChild>
          <Link to="/anunciar">
            <Plus aria-hidden="true" className="size-4" /> Novo anúncio
          </Link>
        </Button>
      </header>
      <CaixaInfo>Por enquanto aparecem só os anúncios ativos. Os pausados voltam a aparecer aqui quando o servidor tiver a lista de anúncios de cada pessoa.</CaixaInfo>
      <GradeAnuncios
        anuncios={meus}
        carregando={feed.isPending}
        erro={feed.error}
        aoTentarDeNovo={() => feed.refetch()}
        vazio={
          <>
            Você ainda não tem anúncios ativos.{' '}
            <Link to="/anunciar" className="font-semibold text-brand hover:underline">
              Criar o primeiro
            </Link>
          </>
        }
      />
      {feed.hasNextPage && (
        <Button variant="secondary" className="self-center" loading={feed.isFetchingNextPage} onClick={() => feed.fetchNextPage()}>
          Carregar mais
        </Button>
      )}
    </div>
  )
}
