import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { DropdownMenu } from 'radix-ui'
import { ChevronDown, CircleHelp, House, LogOut, MessageCircle, Plus, Search, ShieldCheck, User } from 'lucide-react'
import { useSair, useSessao } from '@/api/auth'
import { useEncerrarSessaoLocal } from '@/api/conta'
import { avisar } from '@/stores/avisos'
import { cn } from '@/lib/cn'
import { Avatar, Logo } from '@/components/ui/Marca'
import { Button } from '@/components/ui/Button'
import { Confirmacao } from '@/components/ui/Modal'
import { StatusServidor } from '@/components/StatusServidor'
import { useFocoNaTroca } from './useFocoNaTroca'

/** Navegação principal: mesmos itens da barra inferior dos protótipos (001, 052). */
const navegacao = [
  { to: '/', rotulo: 'Início', icone: House, fim: true },
  { to: '/buscar', rotulo: 'Buscar', icone: Search },
  { to: '/anunciar', rotulo: 'Anunciar', icone: Plus, destaque: true },
  { to: '/chat', rotulo: 'Chat', icone: MessageCircle },
  { to: '/perfil', rotulo: 'Perfil', icone: User },
]

const institucional = [
  { to: '/sobre', rotulo: 'Sobre o Steely' },
  { to: '/ajuda', rotulo: 'Central de Ajuda' },
  { to: '/termos', rotulo: 'Termos de Uso' },
  { to: '/privacidade', rotulo: 'Política de Privacidade' },
]

function MenuUsuario() {
  const { data: usuario } = useSessao()
  const sair = useSair()
  const encerrarLocal = useEncerrarSessaoLocal()
  const navigate = useNavigate()
  const [confirmarSaida, setConfirmarSaida] = useState(false)

  if (!usuario) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="secondary" size="sm">
          <Link to="/entrar">Entrar</Link>
        </Button>
        <Button asChild size="sm" className="hidden md:inline-flex">
          <Link to="/criar-conta">Criar conta</Link>
        </Button>
      </div>
    )
  }

  const item = 'flex min-h-11 cursor-pointer items-center gap-3 rounded-sm px-3 text-14 outline-none data-highlighted:bg-field'

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button type="button" className="touch-target flex items-center gap-2 rounded-md px-1.5 hover:bg-field" aria-label={`Menu da conta de ${usuario.displayName}`}>
            <Avatar url={usuario.avatarUrl} nome={usuario.displayName} tamanho="sm" />
            <span className="hidden text-14 font-semibold md:inline">{usuario.displayName}</span>
            <ChevronDown aria-hidden="true" className="hidden size-4 text-icon md:block" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end" sideOffset={8} className="z-40 min-w-56 rounded-md border border-line bg-surface p-1.5">
            <DropdownMenu.Item className={item} onSelect={() => navigate('/perfil')}>
              <User aria-hidden="true" className="size-4 text-icon" /> Meu perfil
            </DropdownMenu.Item>
            <DropdownMenu.Item className={item} onSelect={() => navigate('/seguranca')}>
              <ShieldCheck aria-hidden="true" className="size-4 text-icon" /> Segurança
            </DropdownMenu.Item>
            <DropdownMenu.Item className={item} onSelect={() => navigate('/ajuda')}>
              <CircleHelp aria-hidden="true" className="size-4 text-icon" /> Central de Ajuda
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-line" />
            <DropdownMenu.Item className={cn(item, 'text-danger')} onSelect={() => setConfirmarSaida(true)}>
              <LogOut aria-hidden="true" className="size-4" /> Sair
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Confirmacao
        aberto={confirmarSaida}
        aoMudar={setConfirmarSaida}
        titulo="Sair da sua conta?"
        descricao="Você vai precisar entrar de novo neste navegador."
        confirmar="Sair"
        carregando={sair.isPending}
        aoConfirmar={() =>
          sair.mutate(undefined, {
            // Mesmo com erro (sessão já expirada), sai localmente e vai para a página pública (STY009).
            onSettled: () => {
              setConfirmarSaida(false)
              navigate('/')
              encerrarLocal()
              avisar('Você saiu da sua conta.')
            },
          })
        }
      />
    </>
  )
}

function Busca() {
  const navigate = useNavigate()
  return (
    <form
      role="search"
      className="relative w-full max-w-xl"
      onSubmit={(e) => {
        e.preventDefault()
        navigate('/buscar')
      }}
    >
      <label htmlFor="busca-global" className="sr-only">
        Buscar peças e componentes
      </label>
      <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-icon" />
      <input
        id="busca-global"
        type="search"
        placeholder="Buscar placa de vídeo, memória, SSD…"
        className="control-height w-full rounded-md border border-control bg-field pl-10 pr-4 text-14 focus-visible:border-brand focus-visible:outline-offset-0"
      />
    </form>
  )
}

/**
 * Estrutura das páginas (ADR-20, mobile-first): abaixo de 1024 px, barra inferior como nos
 * protótipos; a partir de 1024 px, menu lateral. Conteúdo limitado a 1440 px.
 */
export function AppShell() {
  useFocoNaTroca()

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[auto_1fr]">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-3 focus:font-semibold focus:text-on-brand">
        Pular para o conteúdo
      </a>

      <aside className="sidebar-width sticky top-0 hidden h-dvh flex-col gap-8 border-r border-line bg-app px-5 py-6 lg:flex">
        <Link to="/" aria-label="Steely, página inicial" className="text-fg">
          <Logo />
        </Link>
        <nav aria-label="Principal">
          <ul className="flex flex-col gap-1">
            {navegacao.map(({ to, rotulo, icone: Icone, fim }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={fim}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-11 items-center gap-3 rounded-md px-3 text-15 font-semibold',
                      isActive ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-field hover:text-fg',
                    )
                  }
                >
                  <Icone aria-hidden="true" className="size-5" />
                  {rotulo}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Institucional" className="mt-auto">
          <ul className="flex flex-col gap-1">
            {institucional.map(({ to, rotulo }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) => cn('flex min-h-11 items-center rounded-sm px-3 text-13', isActive ? 'text-brand' : 'text-muted hover:text-fg')}
                >
                  {rotulo}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="topbar-height sticky top-0 z-30 flex items-center gap-4 border-b border-line bg-app px-4 md:px-6">
          <Link to="/" aria-label="Steely, página inicial" className="text-fg lg:hidden">
            <Logo className="h-7" />
          </Link>
          <div className="hidden flex-1 md:block">
            <Busca />
          </div>
          <div className="ml-auto">
            <MenuUsuario />
          </div>
        </header>

        <main id="conteudo" className="bottom-nav-offset mx-auto w-full max-w-content flex-1 px-4 pt-6 md:px-6 lg:px-10 lg:pb-12">
          <Outlet />
        </main>

        <footer className="hidden items-center justify-between gap-4 border-t border-line px-10 py-6 text-13 text-muted lg:flex">
          <span>Steely · Projeto acadêmico da Escola de TI — UniCesumar · 2026</span>
          <StatusServidor />
        </footer>
      </div>

      <nav aria-label="Principal (celular)" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-app lg:hidden">
        <ul className="mx-auto flex max-w-xl items-start justify-between px-4 pb-3 pt-2">
          {navegacao.map(({ to, rotulo, icone: Icone, fim, destaque }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={fim}
                className={({ isActive }) =>
                  cn('flex min-h-14 flex-col items-center justify-center gap-1 text-11 font-medium', isActive ? 'text-brand' : 'text-muted')
                }
              >
                {destaque ? (
                  <span className="flex size-12 items-center justify-center rounded-full bg-brand text-on-brand">
                    <Icone aria-hidden="true" className="size-5" strokeWidth={2.4} />
                  </span>
                ) : (
                  <Icone aria-hidden="true" className="size-5" />
                )}
                {rotulo}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
