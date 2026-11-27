import { useId, type ReactNode } from 'react'
import { Checkbox, Switch } from 'radix-ui'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

type CaixaProps = {
  checked: boolean
  onCheckedChange: (valor: boolean) => void
  children: ReactNode
  error?: string
  name?: string
}

/** Caixa de seleção (Radix Checkbox) com rótulo clicável e erro associado. */
export function CaixaSelecao({ checked, onCheckedChange, children, error, name }: CaixaProps) {
  const id = useId()
  const erroId = error ? `${id}-erro` : undefined
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <Checkbox.Root
          id={id}
          name={name}
          checked={checked}
          onCheckedChange={(v) => onCheckedChange(v === true)}
          aria-invalid={error ? true : undefined}
          aria-describedby={erroId}
          className={cn(
            'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-sm border border-control bg-field',
            'data-[state=checked]:border-brand data-[state=checked]:bg-brand aria-invalid:border-danger',
          )}
        >
          <Checkbox.Indicator>
            <Check aria-hidden="true" className="size-4 text-on-brand" strokeWidth={3} />
          </Checkbox.Indicator>
        </Checkbox.Root>
        <label htmlFor={id} className="text-14 text-muted">
          {children}
        </label>
      </div>
      {error && (
        <p id={erroId} className="text-13 text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

type InterruptorProps = {
  checked: boolean
  onCheckedChange: (valor: boolean) => void
  /** id do elemento que dá nome ao interruptor. */
  labelledBy: string
  describedBy?: string
  disabled?: boolean
}

/** Interruptor (Radix Switch) com o visual .toggle dos protótipos: 44 × 26 px. */
export function Interruptor({ checked, onCheckedChange, labelledBy, describedBy, disabled }: InterruptorProps) {
  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6.5 w-11 shrink-0 items-center rounded-full border border-control bg-field transition-colors',
        'data-[state=checked]:border-brand data-[state=checked]:bg-brand disabled:opacity-50',
      )}
    >
      <Switch.Thumb
        className={cn(
          'block size-5 translate-x-0.5 rounded-full bg-fg transition-transform',
          'data-[state=checked]:translate-x-5 data-[state=checked]:bg-app',
        )}
      />
    </Switch.Root>
  )
}
