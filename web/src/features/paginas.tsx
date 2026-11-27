import { useState } from 'react'
import { Link } from 'react-router'
import { ToggleGroup } from 'radix-ui'
import { Construction, Recycle, ScanSearch, ShieldCheck } from 'lucide-react'
import { useFeed } from '@/api/anuncios'
import { useSessao } from '@/api/auth'
import { CATEGORIAS } from '@/lib/anuncios'
import { cn } from '@/lib/cn'
import { GradeAnuncios } from '@/components/anuncios/CartaoAnuncio'
import { MetaPagina } from '@/components/MetaPagina'
import { Button } from '@/components/ui/Button'
import { Cartao, IconeEmCaixa } from '@/components/ui/Exibicao'

/** Feed de anúncios ativos (tela 001): impulsionados primeiro, paginação por cursor. */
function FeedAnuncios() {
  const [categoria, setCategoria] = useState('')
  const feed = useFeed(categoria)
  const anuncios = feed.data?.pages.flatMap((p) => p.items)
  return (
    <section aria-labelledby="titulo-feed" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="titulo-feed" className="font-title text-18 font-bold">
          Anúncios recentes
        </h2>
        <Link to="/buscar" className="text-13 font-semibold text-brand hover:underline">
          Busca avançada
        </Link>
      </div>
      <ToggleGroup.Root
        type="single"
        value={categoria || 'todas'}
        onValueChange={(v) => v && setCategoria(v === 'todas' ? '' : v)}
        aria-label="Filtrar por categoria"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0"
      >
        {[{ valor: 'todas', rotulo: 'Todas' }, ...CATEGORIAS].map((c) => (
          <ToggleGroup.Item
            key={c.valor}
            value={c.valor}
            className={cn(
              'touch-target shrink-0 rounded-full border border-control bg-field px-4 text-13 font-semibold text-muted',
              'data-[state=on]:border-brand data-[state=on]:bg-brand data-[state=on]:text-on-brand',
            )}
          >
            {c.rotulo}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
      <GradeAnuncios
        anuncios={anuncios}
        carregando={feed.isPending}
        erro={feed.error}
        aoTentarDeNovo={() => feed.refetch()}
        vazio={
          <>
            Nenhum anúncio ativo por aqui ainda.{' '}
            <Link to="/anunciar" className="font-semibold text-brand hover:underline">
              Anuncie uma peça
            </Link>
          </>
        }
      />
      {feed.hasNextPage && (
        <Button variant="secondary" className="self-center" loading={feed.isFetchingNextPage} onClick={() => feed.fetchNextPage()}>
          Carregar mais
        </Button>
      )}
    </section>
  )
}

/** Página inicial: destaque, feed de anúncios (tela 001) e como funciona. */
export function InicioPage() {
  const { data: usuario } = useSessao()
  return (
    <div className="flex flex-col gap-10">
      <MetaPagina titulo="Início" descricao="Compre e venda peças e componentes de TI reaproveitáveis, com laudo por IA em cada anúncio." />
      <section className="flex flex-col gap-4 rounded-lg border border-brand-line bg-brand-subtle p-6 md:p-10">
        <h1 className="max-w-2xl font-title text-24 font-bold">
          {usuario ? `Olá, ${usuario.displayName}!` : 'Conectando hardware com propósito.'}
        </h1>
        <p className="max-w-2xl text-15 text-muted">
          Compre e venda peças e componentes de TI reaproveitáveis, com laudo por IA em cada anúncio.
        </p>
        <div className="flex flex-wrap gap-3">
          {usuario ? (
            <>
              <Button asChild>
                <Link to="/perfil">Ver meu perfil</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/seguranca">Segurança da conta</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild>
                <Link to="/criar-conta">Criar conta</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/entrar">Entrar</Link>
              </Button>
            </>
          )}
        </div>
      </section>

      <FeedAnuncios />

      <ul className="grid gap-4 md:grid-cols-3">
        {[
          { icone: Recycle, titulo: 'Reuso que dá segunda vida', texto: 'Menos lixo eletrônico, mais hardware útil.' },
          { icone: ShieldCheck, titulo: 'Confiança em cada negociação', texto: 'Moderação, avaliações e pagamento protegido.' },
          { icone: ScanSearch, titulo: 'Laudo técnico com IA', texto: 'Identificação de peças pela foto em segundos.' },
        ].map(({ icone: Icone, titulo, texto }) => (
          <li key={titulo}>
            <Cartao className="flex h-full flex-col gap-3 p-5">
              <IconeEmCaixa tom="brand">
                <Icone className="size-5" />
              </IconeEmCaixa>
              <h2 className="font-title text-16 font-medium">{titulo}</h2>
              <p className="text-14 text-muted">{texto}</p>
            </Cartao>
          </li>
        ))}
      </ul>
      <section aria-labelledby="como-funciona" className="flex flex-col gap-4">
        <h2 id="como-funciona" className="font-title text-18 font-bold">
          Como funciona
        </h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {[
            { titulo: 'Anuncie com laudo por IA', texto: 'Fotografe a peça: o Scanner IA identifica o modelo e sugere os dados do anúncio.' },
            { titulo: 'Negocie com segurança', texto: 'Converse pelo chat e pague pelo Steely. O valor fica retido até a entrega.' },
            { titulo: 'Entregue e avalie', texto: 'A entrega é confirmada por QR Code e cada negociação soma no seu impacto ESG.' },
          ].map((passo, i) => (
            <li key={passo.titulo} className="flex items-start gap-4 rounded-md border border-line p-5">
              <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand font-title text-18 font-bold text-on-brand">
                {i + 1}
              </span>
              <span className="flex flex-col gap-1">
                <span className="font-title text-16 font-medium">{passo.titulo}</span>
                <span className="text-14 text-muted">{passo.texto}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

/** Áreas da navegação que chegam em outras entregas (busca, anúncios, chat, carteira, ESG). */
export function EmBrevePage({ titulo }: { titulo: string }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-4 py-10">
      <MetaPagina titulo={titulo} privada />
      <IconeEmCaixa tom="esg" className="size-14 rounded-lg">
        <Construction className="size-6" />
      </IconeEmCaixa>
      <h1 className="font-title text-24 font-bold">{titulo}</h1>
      <p className="text-15 text-muted">Esta área chega em uma próxima entrega do Steely.</p>
      <Button asChild variant="secondary">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </div>
  )
}

export function NaoEncontradaPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-4 py-10">
      <MetaPagina titulo="Página não encontrada" privada />
      <h1 className="font-title text-24 font-bold">Página não encontrada</h1>
      <p className="text-15 text-muted">O endereço que você abriu não existe ou mudou de lugar.</p>
      <Button asChild>
        <Link to="/">Voltar ao início</Link>
      </Button>
    </div>
  )
}
