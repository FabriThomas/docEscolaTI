import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Copy, Download } from 'lucide-react'
import { desativar2faSchema, trocarSenhaSchema, type Desativar2faInput, type TrocarSenhaInput } from '@steely/schemas'
import { useConfirmar2fa, useDesativar2fa, useIniciar2fa, useTrocarSenha } from '@/api/conta'
import { mensagemDeErro } from '@/api/erros'
import { ApiError } from '@/api/http'
import { avisar } from '@/stores/avisos'
import { Button } from '@/components/ui/Button'
import { CampoSenha, CampoTexto } from '@/components/ui/Campo'
import { CampoCodigo } from '@/components/ui/CampoCodigo'
import { CaixaInfo } from '@/components/ui/Exibicao'
import { Modal } from '@/components/ui/Modal'
import { CaixaSelecao } from '@/components/ui/Selecao'
import { ForcaSenha } from '@/features/auth/componentes'

type Controle = { aberto: boolean; aoMudar: (aberto: boolean) => void }

function ErroApi({ erro }: { erro: unknown }) {
  if (!erro || (erro instanceof ApiError && Object.keys(erro.errosPorCampo).length > 0)) return null
  return (
    <CaixaInfo tom="danger" role="alert">
      <span className="text-fg">{mensagemDeErro(erro)}</span>
    </CaixaInfo>
  )
}

/** Alterar senha (STY008): senha atual, nova (critérios) e confirmação. Encerra as demais sessões. */
export function DialogoTrocarSenha({ aberto, aoMudar }: Controle) {
  const trocar = useTrocarSenha()
  const { register, handleSubmit, formState, control, reset, setError } = useForm({
    resolver: zodResolver(trocarSenhaSchema),
    mode: 'onTouched',
    defaultValues: { currentPassword: '', newPassword: '', newPasswordConfirmation: '' },
  })
  const nova = useWatch({ control, name: 'newPassword' }) ?? ''

  function fechar(valor: boolean) {
    if (!valor) {
      reset()
      trocar.reset()
    }
    aoMudar(valor)
  }

  function enviar(dados: TrocarSenhaInput) {
    trocar.mutate(
      { currentPassword: dados.currentPassword, newPassword: dados.newPassword },
      {
        onSuccess: () => {
          avisar('Senha alterada. Encerramos as sessões nos outros aparelhos.')
          fechar(false)
        },
        onError: (e) => {
          if (!(e instanceof ApiError)) return
          const campos = e.errosPorCampo
          if (campos.currentPassword) setError('currentPassword', { message: campos.currentPassword })
          if (campos.newPassword) setError('newPassword', { message: campos.newPassword })
        },
      },
    )
  }

  return (
    <Modal aberto={aberto} aoMudar={fechar} titulo="Alterar senha" descricao="Por segurança, as sessões nos outros aparelhos serão encerradas.">
      <form noValidate onSubmit={handleSubmit(enviar)} className="flex flex-col gap-4">
        <ErroApi erro={trocar.error} />
        <CampoSenha label="Senha atual" autoComplete="current-password" required error={formState.errors.currentPassword?.message} {...register('currentPassword')} />
        <div className="flex flex-col gap-3">
          <CampoSenha label="Nova senha" autoComplete="new-password" required error={formState.errors.newPassword?.message} {...register('newPassword')} />
          <ForcaSenha senha={nova} />
        </div>
        <CampoSenha
          label="Confirmar nova senha"
          autoComplete="new-password"
          required
          error={formState.errors.newPasswordConfirmation?.message}
          {...register('newPasswordConfirmation')}
        />
        <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
          <Button variant="secondary" onClick={() => fechar(false)}>
            Cancelar
          </Button>
          <Button type="submit" loading={trocar.isPending}>
            Salvar nova senha
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/** Mostra os códigos de recuperação uma única vez (STY007 passos 6 e 7). */
export function ListaCodigos({ codigos, aoConcluir }: { codigos: string[]; aoConcluir: () => void }) {
  const [guardou, setGuardou] = useState(false)
  const texto = codigos.join('\n')

  return (
    <div className="flex flex-col gap-4">
      <CaixaInfo>
        Guarde estes códigos em um lugar seguro. Cada um entra uma vez se você perder o aparelho. Eles não serão mostrados de novo.
      </CaixaInfo>
      <ol aria-label="Códigos de recuperação" className="grid grid-cols-2 gap-2 rounded-md border border-line bg-app p-4 font-title text-15">
        {codigos.map((c) => (
          <li key={c} className="text-center tracking-wider">
            {c}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon={<Copy aria-hidden="true" className="size-4" />}
          onClick={() =>
            navigator.clipboard
              .writeText(texto)
              .then(() => avisar('Códigos copiados.'))
              .catch(() => avisar('Não foi possível copiar. Anote os códigos.', 'erro'))
          }
        >
          Copiar
        </Button>
        <Button asChild variant="secondary" size="sm">
          <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(`Códigos de recuperação do Steely\n\n${texto}\n`)}`} download="steely-codigos-de-recuperacao.txt">
            <Download aria-hidden="true" className="size-4" />
            Baixar .txt
          </a>
        </Button>
      </div>
      <CaixaSelecao checked={guardou} onCheckedChange={setGuardou}>
        Guardei os códigos em um lugar seguro.
      </CaixaSelecao>
      <Button full disabled={!guardou} onClick={aoConcluir}>
        Concluir
      </Button>
    </div>
  )
}

/** Ativar 2FA por aplicativo autenticador (STY007 passos 3 a 8). */
export function DialogoAtivar2fa({ aberto, aoMudar }: Controle) {
  const iniciar = useIniciar2fa()
  const confirmar = useConfirmar2fa()
  const [codigo, setCodigo] = useState('')

  function fechar(valor: boolean) {
    if (!valor) {
      // Abandonar antes de validar descarta o segredo gerado (STY007, fluxo alternativo 3).
      iniciar.reset()
      confirmar.reset()
      setCodigo('')
    }
    aoMudar(valor)
  }

  const codigos = confirmar.data?.codes

  return (
    <Modal
      aberto={aberto}
      aoMudar={fechar}
      titulo={codigos ? 'Verificação em duas etapas ativada' : 'Ativar verificação em duas etapas'}
      descricao={codigos ? undefined : 'Use um aplicativo autenticador (como Google Authenticator ou Authy) para gerar os códigos.'}
    >
      {codigos ? (
        <ListaCodigos
          codigos={codigos}
          aoConcluir={() => {
            avisar('Verificação em duas etapas ativada.')
            fechar(false)
          }}
        />
      ) : !iniciar.data ? (
        <div className="flex flex-col gap-4">
          <ErroApi erro={iniciar.error} />
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-14 text-muted">
            <li>Gere a chave e cadastre no aplicativo autenticador.</li>
            <li>Digite o código de 6 números que o aplicativo mostrar.</li>
            <li>Guarde os códigos de recuperação.</li>
          </ol>
          <Button full loading={iniciar.isPending} onClick={() => iniciar.mutate()}>
            Gerar chave
          </Button>
        </div>
      ) : (
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (codigo.length === 6) confirmar.mutate({ code: codigo })
          }}
        >
          <CampoTexto label="Chave para o aplicativo" value={iniciar.data.secret} readOnly className="font-title" hint="Digite esta chave no aplicativo ou abra o link abaixo no celular." />
          <Button asChild variant="secondary" size="sm" className="self-start">
            <a href={iniciar.data.otpauthUrl}>Abrir no aplicativo autenticador</a>
          </Button>
          <CampoCodigo
            valor={codigo}
            aoMudar={setCodigo}
            rotulo="Código gerado pelo aplicativo"
            erro={confirmar.isError ? mensagemDeErro(confirmar.error) : undefined}
          />
          <Button type="submit" full loading={confirmar.isPending} disabled={codigo.length !== 6}>
            Validar e ativar
          </Button>
        </form>
      )}
    </Modal>
  )
}

/** Desativar 2FA exige senha atual e código válido (STY007-RN03). */
export function DialogoDesativar2fa({ aberto, aoMudar }: Controle) {
  const desativar = useDesativar2fa()
  const { register, handleSubmit, formState, reset, setValue, control, setError } = useForm({
    resolver: zodResolver(desativar2faSchema),
    mode: 'onTouched',
    defaultValues: { password: '', code: '' },
  })
  const codigo = useWatch({ control, name: 'code' }) ?? ''

  function fechar(valor: boolean) {
    if (!valor) {
      reset()
      desativar.reset()
    }
    aoMudar(valor)
  }

  function enviar(dados: Desativar2faInput) {
    desativar.mutate(dados, {
      onSuccess: () => {
        avisar('Verificação em duas etapas desativada.')
        fechar(false)
      },
      onError: (e) => {
        if (!(e instanceof ApiError)) return
        const campos = e.errosPorCampo
        if (campos.password) setError('password', { message: campos.password })
        if (campos.code) setError('code', { message: campos.code })
      },
    })
  }

  return (
    <Modal aberto={aberto} aoMudar={fechar} titulo="Desativar verificação em duas etapas" descricao="Sua conta fica menos protegida. Confirme com a senha atual e um código do aplicativo.">
      <form noValidate onSubmit={handleSubmit(enviar)} className="flex flex-col gap-4">
        <ErroApi erro={desativar.error} />
        <CampoSenha label="Senha atual" autoComplete="current-password" required error={formState.errors.password?.message} {...register('password')} />
        <CampoCodigo valor={codigo} aoMudar={(v) => setValue('code', v, { shouldValidate: v.length === 6 })} rotulo="Código do aplicativo" erro={formState.errors.code?.message} />
        <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
          <Button variant="secondary" onClick={() => fechar(false)}>
            Manter ativada
          </Button>
          <Button type="submit" variant="danger" loading={desativar.isPending}>
            Desativar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
