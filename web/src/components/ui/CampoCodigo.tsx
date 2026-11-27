import { useEffect, useId, useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { cn } from '@/lib/cn'

type Props = {
  valor: string
  aoMudar: (valor: string) => void
  /** Chamado quando os 6 dígitos são preenchidos. */
  aoCompletar?: (valor: string) => void
  rotulo?: string
  erro?: string
  desabilitado?: boolean
  tamanho?: number
  autoFocus?: boolean
}

/**
 * Código de verificação em caixas (tela 03). Cada caixa tem rótulo próprio, aceita colar o
 * código inteiro e usa autocomplete="one-time-code" para o preenchimento automático do sistema.
 */
export function CampoCodigo({ valor, aoMudar, aoCompletar, rotulo = 'Código de verificação', erro, desabilitado, tamanho = 6, autoFocus }: Props) {
  const id = useId()
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const digitos = Array.from({ length: tamanho }, (_, i) => valor[i] ?? '')
  // Valor mais recente, atualizado na hora: digitação rápida não pode depender da última renderização.
  const atual = useRef(valor)
  useEffect(() => {
    atual.current = valor
  }, [valor])
  const digitosAtuais = () => Array.from({ length: tamanho }, (_, i) => atual.current[i] ?? '')
  const erroId = erro ? `${id}-erro` : undefined

  function definir(novo: string, focar: number) {
    const limpo = novo.replace(/\D/g, '').slice(0, tamanho)
    atual.current = limpo
    aoMudar(limpo)
    refs.current[Math.min(focar, tamanho - 1)]?.focus()
    if (limpo.length === tamanho) aoCompletar?.(limpo)
  }

  function aoDigitar(indice: number, texto: string) {
    const numeros = texto.replace(/\D/g, '')
    if (!numeros) return
    const lista = digitosAtuais()
    numeros.split('').forEach((n, k) => {
      if (indice + k < tamanho) lista[indice + k] = n
    })
    definir(lista.join(''), indice + numeros.length)
  }

  function aoTecla(indice: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digitos[indice] && indice > 0) {
      e.preventDefault()
      const lista = digitosAtuais()
      lista[indice - 1] = ''
      definir(lista.join(''), indice - 1)
    } else if (e.key === 'ArrowLeft' && indice > 0) refs.current[indice - 1]?.focus()
    else if (e.key === 'ArrowRight' && indice < tamanho - 1) refs.current[indice + 1]?.focus()
  }

  function aoColar(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    definir(e.clipboardData.getData('text'), tamanho - 1)
  }

  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={erroId}>
      <legend className="mb-2 text-13 text-muted">{rotulo}</legend>
      <div className="flex gap-2">
        {digitos.map((digito, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el
            }}
            aria-label={`Dígito ${i + 1} de ${tamanho}`}
            aria-invalid={erro ? true : undefined}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            pattern="[0-9]*"
            maxLength={tamanho}
            value={digito}
            disabled={desabilitado}
            autoFocus={autoFocus && i === 0}
            onChange={(e) => {
              if (e.target.value === '') {
                const lista = digitosAtuais()
                lista[i] = ''
                atual.current = lista.join('').slice(0, tamanho)
                aoMudar(atual.current)
              } else aoDigitar(i, e.target.value.replace(digito, '') || e.target.value)
            }}
            onKeyDown={(e) => aoTecla(i, e)}
            onPaste={aoColar}
            onFocus={(e) => e.target.select()}
            className={cn(
              'control-height w-full min-w-0 max-w-14 rounded-md border border-control bg-field text-center font-title text-20 font-bold text-fg',
              'focus-visible:border-brand focus-visible:outline-offset-0 aria-invalid:border-danger',
            )}
          />
        ))}
      </div>
      {erro && (
        <p id={erroId} className="text-13 text-danger">
          {erro}
        </p>
      )}
    </fieldset>
  )
}
