import { useId, useState, type ComponentProps, type ReactNode } from 'react'
import { Label } from 'radix-ui'
import { Eye, EyeOff, Info } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Campos de formulário (protótipos: .field, .flabel, .input, .hint). Rótulo, dica e erro ligados
 * ao campo por id/aria-describedby; obrigatório marcado com * vermelho e anunciado por texto.
 */

type BaseProps = {
  label: string
  required?: boolean
  hint?: ReactNode
  hintIcon?: ReactNode
  error?: string
  /** Texto à direita do rótulo, ex.: contador 74/160. */
  aside?: ReactNode
}

export function useIdsCampo(error?: string, hint?: ReactNode) {
  const id = useId()
  const dicaId = hint ? `${id}-dica` : undefined
  const erroId = error ? `${id}-erro` : undefined
  return { id, dicaId, erroId, describedBy: [erroId, dicaId].filter(Boolean).join(' ') || undefined }
}

export function RotuloCampo({ htmlFor, label, required, aside }: { htmlFor: string; label: string; required?: boolean; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label.Root htmlFor={htmlFor} className="text-13 text-muted">
        {label}
        {required && (
          <>
            <span aria-hidden="true" className="text-danger">
              {' '}*
            </span>
            <span className="sr-only"> (obrigatório)</span>
          </>
        )}
      </Label.Root>
      {aside}
    </div>
  )
}

export function DicaCampo({ id, children, icon }: { id?: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-1.5 text-11 font-medium text-muted">
      <span aria-hidden="true" className="mt-px shrink-0 text-icon">
        {icon ?? <Info className="size-3.5" />}
      </span>
      <span>{children}</span>
    </p>
  )
}

export function ErroCampo({ id, children }: { id?: string; children?: string }) {
  if (!children) return null
  return (
    <p id={id} className="text-13 text-danger">
      {children}
    </p>
  )
}

export const classeEntrada = cn(
  'w-full control-height rounded-md border border-control bg-field px-4 text-14 text-fg',
  'focus-visible:border-brand focus-visible:outline-offset-0',
  'aria-invalid:border-danger disabled:bg-field-disabled disabled:text-muted disabled:cursor-not-allowed read-only:bg-field-disabled',
)

type CampoTextoProps = BaseProps & ComponentProps<'input'> & { leading?: ReactNode; trailing?: ReactNode }

export function CampoTexto({ label, required, hint, hintIcon, error, aside, leading, trailing, className, ...input }: CampoTextoProps) {
  const { id, dicaId, erroId, describedBy } = useIdsCampo(error, hint)
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <RotuloCampo htmlFor={id} label={label} required={required} aside={aside} />
      <div className="relative">
        {leading && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-brand">
            {leading}
          </span>
        )}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          className={cn(classeEntrada, leading ? 'pl-11' : null, trailing ? 'pr-14' : null)}
          {...input}
        />
        {trailing && <span className="absolute inset-y-0 right-1 flex items-center">{trailing}</span>}
      </div>
      <ErroCampo id={erroId}>{error}</ErroCampo>
      {hint && (
        <DicaCampo id={dicaId} icon={hintIcon}>
          {hint}
        </DicaCampo>
      )}
    </div>
  )
}

/** Senha com botão de mostrar/ocultar (protótipos 01 e 02). */
export function CampoSenha(props: Omit<CampoTextoProps, 'type' | 'trailing'>) {
  const [visivel, setVisivel] = useState(false)
  return (
    <CampoTexto
      {...props}
      type={visivel ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visivel}
          className="touch-target flex items-center justify-center rounded-sm text-icon hover:text-fg"
        >
          {visivel ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
        </button>
      }
    />
  )
}

type CampoAreaProps = BaseProps & ComponentProps<'textarea'>

export function CampoArea({ label, required, hint, hintIcon, error, aside, className, ...area }: CampoAreaProps) {
  const { id, dicaId, erroId, describedBy } = useIdsCampo(error, hint)
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <RotuloCampo htmlFor={id} label={label} required={required} aside={aside} />
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(classeEntrada, 'min-h-24 resize-y py-3')}
        {...area}
      />
      <ErroCampo id={erroId}>{error}</ErroCampo>
      {hint && (
        <DicaCampo id={dicaId} icon={hintIcon}>
          {hint}
        </DicaCampo>
      )}
    </div>
  )
}
