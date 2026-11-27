import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { mocksAtivos } from '@/mocks/demo'
import { Button } from '@/components/ui/Button'

/**
 * Captcha do Cloudflare Turnstile (ADR-21). Aparece no cadastro, na recuperação e no pedido de
 * código, e no login a partir da 3ª falha (resposta CAPTCHA_REQUIRED). O token é de uso único:
 * mude `chave` para gerar um novo depois de cada envio.
 */

/** Chave de teste oficial da Cloudflare (sempre aprova). Só em desenvolvimento e na demonstração. */
const CHAVE_TESTE = '1x00000000000000000000AA'
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? (import.meta.env.DEV || mocksAtivos ? CHAVE_TESTE : '')
const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

type Turnstile = {
  render: (el: HTMLElement, opcoes: Record<string, unknown>) => string
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: Turnstile
  }
}

let carregamento: Promise<void> | null = null

function carregarScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  carregamento ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      carregamento = null
      reject(new Error('turnstile'))
    }
    document.head.appendChild(script)
  })
  return carregamento
}

type Props = {
  aoObterToken: (token: string | null) => void
  /** Troque o valor para renderizar um novo desafio (token é de uso único). */
  chave?: number
}

export function Captcha({ aoObterToken, chave = 0 }: Props) {
  const area = useRef<HTMLDivElement>(null)
  const [falhou, setFalhou] = useState(!SITE_KEY)
  const [tentativa, setTentativa] = useState(0)
  const callback = useRef(aoObterToken)
  useLayoutEffect(() => {
    callback.current = aoObterToken
  })

  useEffect(() => {
    if (!SITE_KEY) return
    let widgetId: string | null = null
    let cancelado = false
    callback.current(null)

    carregarScript()
      .then(() => {
        if (cancelado || !area.current || !window.turnstile) return
        widgetId = window.turnstile.render(area.current, {
          sitekey: SITE_KEY,
          theme: 'dark',
          language: 'pt-br',
          size: 'flexible',
          callback: (token: string) => callback.current(token),
          'expired-callback': () => callback.current(null),
          'error-callback': () => {
            callback.current(null)
            setFalhou(true)
          },
        })
      })
      .catch(() => !cancelado && setFalhou(true))

    return () => {
      cancelado = true
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
    }
  }, [chave, tentativa])

  return (
    <div role="group" aria-labelledby="captcha-titulo" className="flex flex-col gap-3 rounded-md border border-brand-line bg-brand-subtle p-4">
      <p id="captcha-titulo" className="flex items-center gap-2 text-13 font-semibold">
        <ShieldCheck aria-hidden="true" className="size-4 text-brand" />
        Confirme que você é uma pessoa
      </p>
      {falhou ? (
        <div className="flex flex-col items-start gap-2" role="alert">
          <p className="text-13 text-muted">Não foi possível carregar a verificação. Confira sua conexão e tente de novo.</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setFalhou(false)
              setTentativa((n) => n + 1)
            }}
          >
            Tentar de novo
          </Button>
        </div>
      ) : (
        <div ref={area} className="min-h-16" />
      )}
      <p className="text-11 font-medium text-muted">Verificação feita pela Cloudflare, sem cookies de rastreamento.</p>
    </div>
  )
}
