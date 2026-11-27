import type { ReactNode } from 'react'
import { AlertDialog, Dialog } from 'radix-ui'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

const classeFundo = 'fixed inset-0 z-40 bg-overlay'
const classeCaixa = cn(
  'fixed left-1/2 top-1/2 z-50 flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-4',
  'overflow-y-auto rounded-lg border border-line bg-surface p-6',
)

type ModalProps = {
  aberto: boolean
  aoMudar: (aberto: boolean) => void
  titulo: string
  descricao?: ReactNode
  children: ReactNode
}

/** Modal acessível (Radix Dialog): foco preso, Esc fecha e o foco volta ao botão que abriu. */
export function Modal({ aberto, aoMudar, titulo, descricao, children }: ModalProps) {
  return (
    <Dialog.Root open={aberto} onOpenChange={aoMudar}>
      <Dialog.Portal>
        <Dialog.Overlay className={classeFundo} />
        <Dialog.Content className={classeCaixa}>
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="font-title text-18 font-bold">{titulo}</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Fechar"
                className="touch-target -m-2 flex items-center justify-center rounded-sm text-icon hover:text-fg"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </Dialog.Close>
          </div>
          {descricao ? (
            <Dialog.Description className="text-14 text-muted">{descricao}</Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{titulo}</Dialog.Description>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

type ConfirmacaoProps = {
  aberto: boolean
  aoMudar: (aberto: boolean) => void
  titulo: string
  descricao: ReactNode
  confirmar: string
  aoConfirmar: () => void
  perigo?: boolean
  carregando?: boolean
  children?: ReactNode
}

/** Confirmação de ação (Radix AlertDialog), ex.: sair (STY009 passo 2) e encerrar sessões. */
export function Confirmacao({ aberto, aoMudar, titulo, descricao, confirmar, aoConfirmar, perigo, carregando, children }: ConfirmacaoProps) {
  return (
    <AlertDialog.Root open={aberto} onOpenChange={aoMudar}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={classeFundo} />
        <AlertDialog.Content className={classeCaixa}>
          <AlertDialog.Title className="font-title text-18 font-bold">{titulo}</AlertDialog.Title>
          <AlertDialog.Description className="text-14 text-muted">{descricao}</AlertDialog.Description>
          {children}
          <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary">Cancelar</Button>
            </AlertDialog.Cancel>
            <Button
              variant={perigo ? 'danger' : 'primary'}
              loading={carregando}
              onClick={(e) => {
                e.preventDefault()
                aoConfirmar()
              }}
            >
              {confirmar}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
