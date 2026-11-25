import { Link } from 'react-router'
import { Recycle, ScanSearch, ShieldCheck } from 'lucide-react'
import { MetaPagina } from '@/components/MetaPagina'
import { Button } from '@/components/ui/Button'
import { Cartao, IconeEmCaixa } from '@/components/ui/Exibicao'
import { Logo } from '@/components/ui/Marca'

const pilares = [
  { icone: Recycle, titulo: 'Reuso que dá segunda vida', texto: 'Menos lixo eletrônico, mais hardware útil.', tom: 'esg' as const },
  { icone: ShieldCheck, titulo: 'Confiança em cada negociação', texto: 'Moderação, avaliações e pagamento protegido.', tom: 'brand' as const },
  { icone: ScanSearch, titulo: 'Laudo técnico com IA', texto: 'Identificação de peças pela foto em segundos.', tom: 'brand' as const },
]

/** Tela 045 · Sobre o Steely (EDTS-296). */
export default function SobrePage() {
  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <MetaPagina titulo="Sobre o Steely" descricao="O Steely é um marketplace de peças e componentes de TI reaproveitáveis, com laudo por IA para cada anúncio." />
      <header className="flex flex-col gap-4">
        <Logo className="h-10 text-fg" />
        <h1 className="font-title text-24 font-bold">Sobre o Steely</h1>
        <p className="font-title text-18 font-medium text-brand">Conectando hardware com propósito.</p>
        <p className="text-15 text-muted">
          O Steely é um marketplace de peças e componentes de TI reaproveitáveis, com laudo por IA para cada anúncio.
        </p>
      </header>

      <ul className="grid gap-4 md:grid-cols-3">
        {pilares.map(({ icone: Icone, titulo, texto, tom }) => (
          <li key={titulo}>
            <Cartao className="flex h-full flex-col gap-3 p-5">
              <IconeEmCaixa tom={tom}>
                <Icone className="size-5" />
              </IconeEmCaixa>
              <h2 className="font-title text-16 font-medium">{titulo}</h2>
              <p className="text-14 text-muted">{texto}</p>
            </Cartao>
          </li>
        ))}
      </ul>

      <footer className="flex flex-col gap-4 border-t border-line pt-6 md:flex-row md:items-center md:justify-between">
        <p className="text-13 text-muted">Versão 1.0 · Projeto acadêmico · Escola de TI — UniCesumar</p>
        <Button asChild>
          <Link to="/">Entendi</Link>
        </Button>
      </footer>
    </article>
  )
}
