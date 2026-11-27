import type { ComponentProps, ReactNode } from 'react'
import { Link } from 'react-router'
import { ChevronRight, CircleAlert, Info } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Componentes de exibição dos protótipos: .card, .nicon, .tagchip, .info, .trilho, linha de menu e grupo. */

export function Cartao({ className, children, ...rest }: ComponentProps<'section'>) {
  return (
    <section className={cn('rounded-md border border-line bg-surface', className)} {...rest}>
      {children}
    </section>
  )
}

type Tom = 'brand' | 'esg' | 'danger' | 'muted'
const tonsIcone: Record<Tom, string> = {
  brand: 'bg-brand-soft text-brand',
  esg: 'bg-esg-soft text-esg',
  danger: 'bg-danger-soft text-danger',
  muted: 'bg-muted-soft text-fg',
}

export function IconeEmCaixa({ tom = 'muted', className, children }: { tom?: Tom; className?: string; children: ReactNode }) {
  return (
    <span aria-hidden="true" className={cn('flex size-10 shrink-0 items-center justify-center rounded-md', tonsIcone[tom], className)}>
      {children}
    </span>
  )
}

const tonsEtiqueta: Record<Tom, string> = {
  brand: 'bg-brand-soft text-brand',
  esg: 'bg-esg-soft text-esg',
  danger: 'bg-danger-soft text-danger',
  muted: 'bg-muted-soft text-fg',
}

export function Etiqueta({ tom = 'brand', icon, children, className }: { tom?: Tom; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 text-11 font-medium', tonsEtiqueta[tom], className)}>
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </span>
  )
}

type CaixaInfoProps = { tom?: 'brand' | 'esg' | 'danger'; icon?: ReactNode; children: ReactNode; className?: string; role?: 'alert' | 'status' }

export function CaixaInfo({ tom = 'brand', icon, children, className, role }: CaixaInfoProps) {
  const estilos = {
    brand: 'bg-brand-subtle border-brand-line',
    esg: 'bg-esg-subtle border-esg-line',
    danger: 'bg-danger-soft border-danger-line',
  }[tom]
  const corIcone = { brand: 'text-brand', esg: 'text-esg', danger: 'text-danger' }[tom]
  return (
    <div role={role} className={cn('flex items-start gap-2.5 rounded-md border px-3.5 py-3', estilos, className)}>
      <span aria-hidden="true" className={cn('mt-0.5 shrink-0', corIcone)}>
        {icon ?? (tom === 'danger' ? <CircleAlert className="size-4" /> : <Info className="size-4" />)}
      </span>
      <div className="flex-1 text-13 text-muted">{children}</div>
    </div>
  )
}

/** Trilho de progresso (.trilho). Decorativo: o valor sempre aparece em texto ao lado. */
export function Trilho({ percentual }: { percentual: number }) {
  return (
    <div aria-hidden="true" className="relative h-1.5 overflow-hidden rounded-full bg-raised">
      {/* tokens-ok: largura vem do dado (percentual), não é um tamanho fixo */}
      <span className="absolute inset-y-0 left-0 rounded-full bg-brand" style={{ width: `${Math.max(0, Math.min(100, percentual))}%` }} />
    </div>
  )
}

export function TituloGrupo({ children, aside, id }: { children: ReactNode; aside?: ReactNode; id?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className="font-body text-11 font-semibold uppercase tracking-wide text-muted">
        {children}
      </h2>
      {aside && <span className="text-11 font-medium text-muted">{aside}</span>}
    </div>
  )
}

type LinhaMenuProps = {
  icon: ReactNode
  tom?: Tom
  titulo: ReactNode
  subtitulo?: ReactNode
  direita?: ReactNode
  /** Vira link (com seta) quando informado. */
  to?: string
  onClick?: () => void
  tituloId?: string
  subtituloId?: string
  perigo?: boolean
}

/** Linha de lista com ícone (mrow dos protótipos 052 e 054). */
export function LinhaMenu({ icon, tom = 'muted', titulo, subtitulo, direita, to, onClick, tituloId, subtituloId, perigo }: LinhaMenuProps) {
  const conteudo = (
    <>
      <IconeEmCaixa tom={perigo ? 'danger' : tom} className="size-9 rounded-sm">
        {icon}
      </IconeEmCaixa>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
        <span id={tituloId} className={cn('text-13 font-semibold', perigo ? 'text-danger' : 'text-fg')}>
          {titulo}
        </span>
        {subtitulo && (
          <span id={subtituloId} className="text-11 font-medium text-muted">
            {subtitulo}
          </span>
        )}
      </span>
      {direita ?? ((to || onClick) && <ChevronRight aria-hidden="true" className={cn('size-4', perigo ? 'text-danger' : 'text-icon')} />)}
    </>
  )
  const classes = 'flex w-full items-center gap-3 px-3.5 py-3 min-h-14'
  if (to) {
    return (
      <Link to={to} className={cn(classes, 'hover:bg-field')}>
        {conteudo}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(classes, 'hover:bg-field')}>
        {conteudo}
      </button>
    )
  }
  return <div className={classes}>{conteudo}</div>
}

/** Lista de linhas dentro de um cartão, com divisórias (card + mrow). */
export function ListaCartao({ children, rotulo, rotuladoPor }: { children: ReactNode; rotulo?: string; rotuladoPor?: string }) {
  return (
    <Cartao className="overflow-hidden">
      <ul aria-label={rotulo} aria-labelledby={rotuladoPor} className="divide-y divide-line">
        {children}
      </ul>
    </Cartao>
  )
}
