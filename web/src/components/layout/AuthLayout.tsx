import { Link, Navigate, Outlet, useLocation } from 'react-router'
import { Recycle, ScanSearch, ShieldCheck } from 'lucide-react'
import { useSessao } from '@/api/auth'
import { Logo } from '@/components/ui/Marca'
import { IconeEmCaixa } from '@/components/ui/Exibicao'
import { useFocoNaTroca } from './useFocoNaTroca'

const destaques = [
  { icone: Recycle, titulo: 'Reuso que dá segunda vida', texto: 'Menos lixo eletrônico, mais hardware útil.' },
  { icone: ShieldCheck, titulo: 'Confiança em cada negociação', texto: 'Moderação, avaliações e pagamento protegido.' },
  { icone: ScanSearch, titulo: 'Laudo técnico com IA', texto: 'Identificação de peças pela foto em segundos.' },
]

/**
 * Telas de autenticação (01 a 05). No celular, só o formulário, como no protótipo;
 * a partir de 1024 px, painel da marca à esquerda.
 */
export function AuthLayout() {
  useFocoNaTroca()
  const { data: usuario } = useSessao()
  const location = useLocation()
  const destino = (location.state as { de?: string } | null)?.de ?? '/perfil'

  // O formulário aparece na hora, sem esperar a verificação da sessão (melhor LCP).
  // Quem já está logado não precisa ver login/cadastro (exceto a redefinição de senha).
  if (usuario && !location.pathname.startsWith('/redefinir-senha')) return <Navigate to={destino} replace />

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-2">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-3 focus:font-semibold focus:text-on-brand">
        Pular para o conteúdo
      </a>
      <aside className="hidden flex-col justify-between border-r border-line bg-page p-12 lg:flex">
        <Link to="/" aria-label="Steely, página inicial" className="text-fg">
          <Logo className="h-10" />
        </Link>
        <div className="flex max-w-md flex-col gap-8">
          <p className="font-title text-24 font-bold">Conectando hardware com propósito.</p>
          <ul className="flex flex-col gap-5">
            {destaques.map(({ icone: Icone, titulo, texto }) => (
              <li key={titulo} className="flex items-start gap-4">
                <IconeEmCaixa tom="brand">
                  <Icone className="size-5" />
                </IconeEmCaixa>
                <span className="flex flex-col gap-1">
                  <span className="text-15 font-semibold">{titulo}</span>
                  <span className="text-14 text-muted">{texto}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-13 text-muted">Projeto acadêmico · Escola de TI — UniCesumar · 2026</p>
      </aside>

      <main id="conteudo" className="flex justify-center px-6 py-10 md:py-16">
        <div className="flex w-full max-w-md flex-col gap-6">
          <Link to="/" aria-label="Steely, página inicial" className="text-fg lg:hidden">
            <Logo className="h-8" />
          </Link>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
