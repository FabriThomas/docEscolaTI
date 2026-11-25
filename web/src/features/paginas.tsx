import { Link } from 'react-router'
import { Construction, Recycle, ScanSearch, ShieldCheck } from 'lucide-react'
import { useSessao } from '@/api/auth'
import { MetaPagina } from '@/components/MetaPagina'
import { Button } from '@/components/ui/Button'
import { Cartao, IconeEmCaixa } from '@/components/ui/Exibicao'

/** Página inicial pública. O feed de ofertas (tela 001) é de outra tarefa. */
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
