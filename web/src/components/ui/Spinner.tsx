import { LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle aria-hidden="true" className={cn('size-4 animate-spin', className)} strokeWidth={2} />
}

/** Estado de carregamento de uma área inteira, anunciado a leitores de tela. */
export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 py-10 text-muted justify-center">
      <Spinner className="text-brand" />
      <span>{texto}</span>
    </div>
  )
}
