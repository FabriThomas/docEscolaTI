import { Link, useNavigate, useSearchParams } from 'react-router'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, LinkIcon } from 'lucide-react'
import { CODIGOS_ERRO, redefinirSenhaSchema } from '@steely/schemas'
import { useRedefinirSenha } from '@/api/auth'
import { mensagemDeErro } from '@/api/erros'
import { ApiError } from '@/api/http'
import { avisar } from '@/stores/avisos'
import { MetaPagina } from '@/components/MetaPagina'
import { Button } from '@/components/ui/Button'
import { CampoSenha } from '@/components/ui/Campo'
import { CabecalhoAuth, ErroFormulario, ForcaSenha } from './componentes'

/** Nova senha pelo link do e-mail (STY005 passos 5 a 8; RN02, RN04 e RN05). */
export default function RedefinirSenhaPage() {
  const token = useSearchParams()[0].get('token')
  const navigate = useNavigate()
  const redefinir = useRedefinirSenha()
  const { register, handleSubmit, formState, control, setError } = useForm({
    resolver: zodResolver(redefinirSenhaSchema),
    mode: 'onTouched',
    defaultValues: { password: '', passwordConfirmation: '' },
  })
  const senha = useWatch({ control, name: 'password' }) ?? ''
  const linkInvalido = !token || (redefinir.error instanceof ApiError && redefinir.error.code === CODIGOS_ERRO.linkInvalido)

  if (linkInvalido) {
    return (
      <>
        <MetaPagina titulo="Link inválido" />
        <CabecalhoAuth icone={<LinkIcon className="size-6" />} titulo="Este link não vale mais">
          O link de redefinição expirou ou já foi usado. Peça um novo para continuar.
        </CabecalhoAuth>
        <Button asChild full>
          <Link to="/recuperar-senha">Pedir um novo link</Link>
        </Button>
      </>
    )
  }

  return (
    <>
      <MetaPagina titulo="Criar nova senha" />
      <CabecalhoAuth icone={<KeyRound className="size-6" />} titulo="Criar nova senha">
        Depois da troca, encerramos todas as sessões abertas e avisamos você por e-mail.
      </CabecalhoAuth>
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={handleSubmit(({ password }) =>
          redefinir.mutate(
            { token, password },
            {
              onSuccess: () => {
                avisar('Senha redefinida. Entre com a nova senha.')
                navigate('/entrar', { replace: true })
              },
              onError: (e) => {
                if (e instanceof ApiError && e.errosPorCampo.password) setError('password', { message: e.errosPorCampo.password })
              },
            },
          ),
        )}
      >
        {redefinir.isError && !(redefinir.error instanceof ApiError && redefinir.error.errosPorCampo.password) && (
          <ErroFormulario>{mensagemDeErro(redefinir.error)}</ErroFormulario>
        )}
        <div className="flex flex-col gap-3">
          <CampoSenha label="Nova senha" autoComplete="new-password" required error={formState.errors.password?.message} {...register('password')} />
          <ForcaSenha senha={senha} />
        </div>
        <CampoSenha
          label="Confirmar nova senha"
          autoComplete="new-password"
          required
          error={formState.errors.passwordConfirmation?.message}
          {...register('passwordConfirmation')}
        />
        <Button type="submit" full loading={redefinir.isPending}>
          Salvar nova senha
        </Button>
      </form>
    </>
  )
}
