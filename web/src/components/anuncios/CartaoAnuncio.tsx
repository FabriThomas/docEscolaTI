import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { Heart, MapPin, Zap } from 'lucide-react'
import { useAlternarFavorito, type Anuncio } from '@/api/anuncios'
import { useSessao } from '@/api/auth'
import { mensagemDeErro } from '@/api/erros'
import { boostAtivo, categoria, preco, rotuloCondicao } from '@/lib/anuncios'
import { cn } from '@/lib/cn'
import { umaCasa } from '@/lib/formatar'
import { avisar } from '@/stores/avisos'
import { Carregando } from '@/components/ui/Spinner'
import { CaixaInfo } from '@/components/ui/Exibicao'
import { Button } from '@/components/ui/Button'

/** Área de mídia com o ícone da categoria (thumbs do Design System: GPU, CPU, memória, armazenamento). */
export function MidiaAnuncio({ categoria: cat, className, grande }: { categoria: string; className?: string; grande?: boolean }) {
  const { icone: Icone, rotulo } = categoria(cat)
  return (
    <div className={cn('flex items-center justify-center bg-raised text-icon', className)}>
      <Icone aria-hidden="true" className={grande ? 'size-20' : 'size-10'} strokeWidth={1.5} />
      <span className="sr-only">{rotulo}</span>
    </div>
  )
}

/** Favoritar exige login; sem sessão, leva para /entrar e volta. */
export function BotaoFavorito({ anuncio, className }: { anuncio: Pick<Anuncio, 'id' | 'titulo'>; className?: string }) {
  const { data: usuario } = useSessao()
  const navigate = useNavigate()
  const alternar = useAlternarFavorito()
  const favoritado = alternar.data?.anuncio_id === anuncio.id ? alternar.data.is_favorited : undefined

  return (
    <button
      type="button"
      aria-label={`${favoritado ? 'Remover dos favoritos' : 'Favoritar'}: ${anuncio.titulo}`}
      aria-pressed={favoritado ?? undefined}
      disabled={alternar.isPending}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!usuario) return navigate('/entrar', { state: { de: `/anuncios/${anuncio.id}` } })
        alternar.mutate(anuncio.id, {
          onSuccess: (r) => avisar(r.is_favorited ? 'Adicionado aos favoritos.' : 'Removido dos favoritos.'),
          onError: (erro) => avisar(mensagemDeErro(erro), 'erro'),
        })
      }}
      className={cn('touch-target flex items-center justify-center rounded-full bg-overlay text-fg hover:text-brand', className)}
    >
      <Heart aria-hidden="true" className={cn('size-4', favoritado && 'fill-current text-brand')} />
    </button>
  )
}

/** Cartão de anúncio (.ocard dos protótipos 001 e 012). */
export function CartaoAnuncio({ anuncio, rodape }: { anuncio: Anuncio; rodape?: ReactNode }) {
  const impulsionado = boostAtivo(anuncio.boost_active_until)
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-md border border-line bg-surface hover:border-control">
      <div className="relative">
        <MidiaAnuncio categoria={anuncio.categoria} className="h-36" />
        {impulsionado && (
          <span className="absolute left-2 top-2 inline-flex min-h-6 items-center gap-1 rounded-full bg-overlay px-2 text-11 font-medium text-brand">
            <Zap aria-hidden="true" className="size-3" /> Impulsionado
          </span>
        )}
        <BotaoFavorito anuncio={anuncio} className="absolute right-1 top-1" />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-13 font-semibold">
          <Link to={`/anuncios/${anuncio.id}`} className="after:absolute after:inset-0 hover:underline">
            {anuncio.titulo}
          </Link>
        </h3>
        <p className="font-title text-16 font-bold text-brand">{preco(anuncio.preco_centavos)}</p>
        <p className="mt-auto flex items-center gap-1 text-11 font-medium text-muted">
          <MapPin aria-hidden="true" className="size-3 shrink-0 text-icon" />
          <span className="truncate">
            {anuncio.bairro_aproximado ? `${anuncio.bairro_aproximado}, ` : ''}
            {anuncio.cidade} – {anuncio.estado}
            {anuncio.distancia_km != null ? ` · ${umaCasa(anuncio.distancia_km)} km` : ''}
          </span>
        </p>
        <p className="text-11 font-medium text-muted">{rotuloCondicao(anuncio.condicao)}</p>
        {rodape && <div className="relative z-10 pt-2">{rodape}</div>}
      </div>
    </article>
  )
}

/** Grade responsiva com estados de carregamento, vazio e erro. */
export function GradeAnuncios({
  anuncios,
  carregando,
  erro,
  vazio,
  aoTentarDeNovo,
  rodape,
}: {
  anuncios: Anuncio[] | undefined
  carregando: boolean
  erro?: unknown
  vazio: ReactNode
  aoTentarDeNovo?: () => void
  rodape?: (a: Anuncio) => ReactNode
}) {
  if (carregando) return <Carregando texto="Carregando anúncios…" />
  if (erro) {
    return (
      <CaixaInfo tom="danger" role="alert">
        <div className="flex flex-col items-start gap-2 text-fg">
          {mensagemDeErro(erro, 'Não foi possível carregar os anúncios.')}
          {aoTentarDeNovo && (
            <Button variant="secondary" size="sm" onClick={aoTentarDeNovo}>
              Tentar de novo
            </Button>
          )}
        </div>
      </CaixaInfo>
    )
  }
  if (!anuncios?.length) return <div className="rounded-md border border-dashed border-line p-8 text-center text-14 text-muted">{vazio}</div>
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
      {anuncios.map((a) => (
        <li key={a.id}>
          <CartaoAnuncio anuncio={a} rodape={rodape?.(a)} />
        </li>
      ))}
    </ul>
  )
}
