import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { Check, ChevronLeft, Circle, Clock, FlaskConical } from 'lucide-react'
import { criteriosSenha } from '@steely/schemas'
import { cn } from '@/lib/cn'
import { mmss } from '@/lib/formatar'
import { useContagem } from '@/lib/useContagem'
import { DEMO, mocksAtivos, mocksParciais } from '@/mocks/demo'
import { Button } from '@/components/ui/Button'
import { CampoCodigo } from '@/components/ui/CampoCodigo'
import { CaixaInfo, IconeEmCaixa } from '@/components/ui/Exibicao'
import { StatusServidor } from '@/components/StatusServidor'

/** Botão de voltar (.iconbtn) das telas 02 a 05. */
export function Voltar({ para, rotulo = 'Voltar' }: { para?: string; rotulo?: string }) {
  const navigate = useNavigate()
  const classe = 'touch-target flex w-fit items-center gap-1 rounded-sm text-14 text-muted hover:text-fg'
  if (para) {
    return (
      <Link to={para} className={classe}>
        <ChevronLeft aria-hidden="true" className="size-5" /> {rotulo}
      </Link>
    )
  }
  return (
    <button type="button" onClick={() => navigate(-1)} className={classe}>
      <ChevronLeft aria-hidden="true" className="size-5" /> {rotulo}
    </button>
  )
}

export function CabecalhoAuth({ icone, titulo, children }: { icone?: ReactNode; titulo: string; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-3">
      {icone && (
        <IconeEmCaixa tom="brand" className="size-14 rounded-lg border border-brand-line">
          {icone}
        </IconeEmCaixa>
      )}
      <h1 className="font-title text-24 font-bold">{titulo}</h1>
      {children && <div className="text-14 text-muted">{children}</div>}
    </header>
  )
}

/** Critérios da senha (tela 02): lista com o que já foi atendido, anunciada sem atrapalhar a digitação. */
export function ForcaSenha({ senha }: { senha: string }) {
  const atendidos = criteriosSenha.filter((c) => c.teste(senha)).length
  return (
    <div className="flex flex-col gap-2">
      <div aria-hidden="true" className="grid grid-cols-4 gap-1.5">
        {criteriosSenha.map((c, i) => (
          <span key={c.id} className={cn('h-1 rounded-full', i < atendidos ? 'bg-brand' : 'bg-raised')} />
        ))}
      </div>
      <ul aria-label="Requisitos da senha" className="flex flex-wrap gap-x-4 gap-y-1">
        {criteriosSenha.map((c) => {
          const ok = c.teste(senha)
          return (
            <li key={c.id} className={cn('flex items-center gap-1.5 text-11 font-medium', ok ? 'text-brand' : 'text-muted')}>
              {ok ? <Check aria-hidden="true" className="size-3" strokeWidth={3} /> : <Circle aria-hidden="true" className="size-2.5" />}
              {c.rotulo}
              <span className="sr-only">{ok ? ' (atendido)' : ' (pendente)'}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

type ConfirmacaoCodigoProps = {
  codigo: string
  aoMudarCodigo: (codigo: string) => void
  aoConfirmar: (codigo: string) => void
  expiraEm: number
  reenvioEm: number
  aoReenviar: () => void
  reenviando?: boolean
  confirmando?: boolean
  erro?: string
  rotuloBotao?: string
}

/** Digitação do código com validade e reenvio (telas 03 e 05; STY001-RN06 e STY006). */
export function ConfirmacaoCodigo(props: ConfirmacaoCodigoProps) {
  const expira = useContagem(props.expiraEm)
  const reenvio = useContagem(props.reenvioEm)
  const expirou = expira <= 0

  return (
    <form
      className="flex flex-col gap-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (props.codigo.length === 6) props.aoConfirmar(props.codigo)
      }}
    >
      <CampoCodigo valor={props.codigo} aoMudar={props.aoMudarCodigo} aoCompletar={props.aoConfirmar} erro={props.erro} autoFocus />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-13 text-muted">
          <Clock aria-hidden="true" className="size-4 text-icon" />
          {expirou ? (
            <span>O código expirou.</span>
          ) : (
            <span>
              Expira em <strong className="font-semibold text-fg">{mmss(expira)}</strong>
            </span>
          )}
        </p>
        <Button variant="ghost" onClick={props.aoReenviar} disabled={reenvio > 0 || props.reenviando} className="text-13">
          {reenvio > 0 ? `Reenviar em ${mmss(reenvio)}` : 'Reenviar código'}
        </Button>
      </div>
      <Button type="submit" full loading={props.confirmando} disabled={props.codigo.length !== 6 || expirou}>
        {props.rotuloBotao ?? 'Verificar'}
      </Button>
    </form>
  )
}

/** Dicas da API simulada. Só aparece quando os mocks estão ligados (desenvolvimento/demonstração). */
export function AvisoDemonstracao() {
  if (!mocksAtivos) return null
  return (
    <details className="rounded-md border border-esg-line bg-esg-subtle px-4 py-3 text-13">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-semibold text-esg">
        <FlaskConical aria-hidden="true" className="size-4" />
        {mocksParciais ? 'Modo de demonstração (backend parcial)' : 'Modo de demonstração (sem backend)'}
      </summary>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-muted">
        {DEMO.contas.map((c) => (
          <li key={c.email}>
            <span className="text-fg">{c.email}</span> — {c.descricao}
          </li>
        ))}
        <li>
          Senha: <span className="text-fg">{DEMO.senha}</span> · códigos (e-mail e 2FA): <span className="text-fg">{DEMO.codigo}</span>
        </li>
        <li>Errar a senha 3 vezes mostra o captcha; 5 vezes bloqueia por 15 minutos (recarregue para zerar).</li>
      </ul>
      <StatusServidor className="mt-3" />
    </details>
  )
}

export function ErroFormulario({ children }: { children?: ReactNode }) {
  if (!children) return null
  return (
    <CaixaInfo tom="danger" role="alert">
      <div className="text-fg">{children}</div>
    </CaixaInfo>
  )
}
