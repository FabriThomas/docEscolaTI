import { useSaudeApi } from '@/api/servidor'
import { cn } from '@/lib/cn'
import { mocksAtivos, mocksParciais } from '@/mocks/demo'

const bancos = (core: string, daas: string) =>
  core === 'not_configured' && daas === 'not_configured' ? 'bancos ainda não configurados' : `banco principal ${core}, DaaS ${daas}`

/** Situação do FastAPI (GET /api/v1/health), anunciada a leitores de tela. */
export function StatusServidor({ className }: { className?: string }) {
  const tudoSimulado = mocksAtivos && !mocksParciais
  const { data, isPending, isError } = useSaudeApi(!tudoSimulado)

  let tom: 'ok' | 'aviso' | 'erro' = 'ok'
  let texto: string
  if (tudoSimulado) {
    texto = 'API simulada no navegador'
    tom = 'aviso'
  } else if (isPending) {
    texto = 'Conectando ao servidor…'
    tom = 'aviso'
  } else if (isError || !data) {
    texto = 'Servidor fora do ar'
    tom = 'erro'
  } else {
    texto = `${data.status === 'ok' ? 'Servidor conectado' : 'Servidor instável'} · ${bancos(data.coreDb, data.daasDb)}`
    tom = data.status === 'ok' ? 'ok' : 'aviso'
  }

  return (
    <p role="status" className={cn('flex items-center gap-2 text-13 text-muted', className)}>
      <span
        aria-hidden="true"
        className={cn('size-2 shrink-0 rounded-full', tom === 'ok' ? 'bg-brand' : tom === 'erro' ? 'bg-danger-line' : 'bg-esg-line')}
      />
      {texto}
      {mocksParciais && <span className="text-11 font-medium">(login e perfil ainda simulados)</span>}
    </p>
  )
}
