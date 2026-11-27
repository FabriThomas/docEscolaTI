import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { useAvisos } from '@/stores/avisos'
import { cn } from '@/lib/cn'

/** Região de avisos anunciada a leitores de tela (aria-live). */
export function Avisos() {
  const { avisos, fechar } = useAvisos()
  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex flex-col items-center gap-2 lg:bottom-6 lg:left-auto lg:right-6 lg:items-end"
    >
      {avisos.map((aviso) => (
        <div
          key={aviso.id}
          role={aviso.tom === 'erro' ? 'alert' : 'status'}
          className={cn(
            'pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-md border bg-surface px-4 py-3',
            aviso.tom === 'erro' ? 'border-danger-line' : 'border-brand-line',
          )}
        >
          {aviso.tom === 'erro' ? (
            <CircleAlert aria-hidden="true" className="size-5 shrink-0 text-danger" />
          ) : (
            <CircleCheck aria-hidden="true" className="size-5 shrink-0 text-brand" />
          )}
          <p className="flex-1 text-14">{aviso.texto}</p>
          <button
            type="button"
            onClick={() => fechar(aviso.id)}
            aria-label="Fechar aviso"
            className="touch-target -m-2 flex items-center justify-center rounded-sm text-icon hover:text-fg"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
