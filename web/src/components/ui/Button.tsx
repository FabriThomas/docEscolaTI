import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Slot } from 'radix-ui'
import { cn } from '@/lib/cn'
import { Spinner } from './Spinner'

type Variante = 'primary' | 'secondary' | 'danger' | 'ghost'
type Tamanho = 'md' | 'sm'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variante
  size?: Tamanho
  /** Mostra um indicador de carregamento e bloqueia o clique. */
  loading?: boolean
  /** Renderiza o filho (ex.: <Link>) com o visual de botão. */
  asChild?: boolean
  icon?: ReactNode
  full?: boolean
}

const variantes: Record<Variante, string> = {
  primary: 'bg-brand text-on-brand hover:brightness-110',
  secondary: 'bg-field text-fg border border-line hover:border-control',
  danger: 'bg-field text-danger border border-danger-line hover:border-danger',
  ghost: 'text-brand hover:underline underline-offset-4',
}

const tamanhos: Record<Tamanho, string> = {
  md: 'control-height px-5 text-15 rounded-md',
  sm: 'min-h-9 px-3 text-13 rounded-sm',
}

/** Botão do Design System (tela base: .btn primary/secondary dos protótipos). Área de toque ≥ 44 px. */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  asChild = false,
  icon,
  full,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 font-semibold touch-target transition-[filter,border-color] select-none',
    'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
    variantes[variant],
    variant !== 'ghost' && tamanhos[size],
    variant === 'ghost' && 'text-15 rounded-sm px-1',
    full && 'w-full',
    className,
  )

  if (asChild) {
    return (
      <Slot.Root className={classes} {...rest}>
        {children}
      </Slot.Root>
    )
  }

  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  )
}
