import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Smartphone } from 'lucide-react'
import { CODIGOS_ERRO, loginSchema, type LoginPayload } from '@steely/schemas'
import { useConfirmarSegundoFator, useEntrar, useReativarConta, useReenviarCodigoEmail } from '@/api/auth'
import { mensagemDeErro } from '@/api/erros'
import { ApiError } from '@/api/http'
import { dataCurta, mmss } from '@/lib/formatar'
import { useContagem } from '@/lib/useContagem'
import { avisar } from '@/stores/avisos'
import { MetaPagina } from '@/components/MetaPagina'
import { Button } from '@/components/ui/Button'
import { CampoSenha, CampoTexto } from '@/components/ui/Campo'
import { CampoCodigo } from '@/components/ui/CampoCodigo'
import { Captcha } from './Captcha'
import { AvisoDemonstracao, CabecalhoAuth, ErroFormulario } from './componentes'

type Desafio = { challengeId: string; method: 'APP' | 'EMAIL' }

/** Etapa do segundo fator (STY002 passos 5 e 6; RN05). */
function SegundoFator({ desafio, aoVoltar, aoConcluir }: { desafio: Desafio; aoVoltar: () => void; aoConcluir: () => void }) {
  const [codigo, setCodigo] = useState('')
  const confirmar = useConfirmarSegundoFator()
  const enviar = (code: string) => confirmar.mutate({ challengeId: desafio.challengeId, code }, { onSuccess: aoConcluir })

  return (
    <>
      <MetaPagina titulo="Verificação em duas etapas" />
      <CabecalhoAuth icone={<Smartphone className="size-6" />} titulo="Verificação em duas etapas">
        {desafio.method === 'APP'
          ? 'Digite o código de 6 números do seu aplicativo autenticador.'
          : 'Digite o código de 6 números que enviamos para o seu e-mail.'}
      </CabecalhoAuth>
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (codigo.length === 6) enviar(codigo)
        }}
      >
        <CampoCodigo valor={codigo} aoMudar={setCodigo} aoCompletar={enviar} erro={confirmar.isError ? mensagemDeErro(confirmar.error) : undefined} autoFocus />
        <Button type="submit" full loading={confirmar.isPending} disabled={codigo.length !== 6}>
          Confirmar e entrar
        </Button>
        <Button variant="ghost" onClick={aoVoltar} className="self-center">
          Voltar para o login
        </Button>
      </form>
    </>
  )
}

/** Tela 01 · Login (STY002, STY003, STY004; ADR-21). */
export default function EntrarPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const destino = (location.state as { de?: string } | null)?.de ?? '/perfil'

  const entrar = useEntrar()
  const reativar = useReativarConta()
  const reenviarCodigo = useReenviarCodigoEmail()

  const [desafio, setDesafio] = useState<Desafio | null>(null)
  const [pedirCaptcha, setPedirCaptcha] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [chaveCaptcha, setChaveCaptcha] = useState(0)
  const [bloqueadoAte, setBloqueadoAte] = useState<number | null>(null)
  const bloqueio = useContagem(bloqueadoAte)

  const form = useForm({ resolver: zodResolver(loginSchema), mode: 'onTouched' })
  const { register, handleSubmit, formState, getValues } = form
  const erro = entrar.error
  const codigoErro = erro instanceof ApiError ? erro.code : undefined

  const concluir = () => navigate(destino, { replace: true })

  function enviar(dados: LoginPayload) {
    if (pedirCaptcha && !captchaToken) return
    entrar.mutate(
      { ...dados, captchaToken },
      {
        onSuccess: (resposta) => {
          if (resposta.status === 'TWO_FACTOR_REQUIRED') setDesafio({ challengeId: resposta.challengeId, method: resposta.method })
          else concluir()
        },
        onError: (e) => {
          if (!(e instanceof ApiError)) return
          if (e.code === CODIGOS_ERRO.captchaObrigatorio) setPedirCaptcha(true)
          if (e.code === CODIGOS_ERRO.loginBloqueado && e.retryAfterSegundos) setBloqueadoAte(Date.now() + e.retryAfterSegundos * 1000)
        },
        // Token do Turnstile é de uso único: depois de cada envio, gera outro desafio.
        onSettled: () => {
          if (pedirCaptcha) setChaveCaptcha((n) => n + 1)
        },
      },
    )
  }

  if (desafio) return <SegundoFator desafio={desafio} aoVoltar={() => setDesafio(null)} aoConcluir={concluir} />

  const bloqueado = bloqueio > 0
  const emailNaoVerificado = erro instanceof ApiError ? (erro.problema.email as string | undefined) : undefined
  const carenciaAte = erro instanceof ApiError ? (erro.problema.effectiveAt as string | undefined) : undefined

  return (
    <>
      <MetaPagina titulo="Entrar" descricao="Acesse sua conta Steely para comprar, vender e acompanhar seu impacto ESG." />
      <CabecalhoAuth titulo="Acesse sua conta">Conectando hardware com propósito.</CabecalhoAuth>
      <AvisoDemonstracao />

      <form noValidate onSubmit={handleSubmit(enviar)} className="flex flex-col gap-5">
        {erro && (
          <ErroFormulario>
            {bloqueado ? (
              <>
                Acesso bloqueado temporariamente por excesso de tentativas. Tente de novo em <strong>{mmss(bloqueio)}</strong>. Avisamos o
                titular da conta por e-mail.
              </>
            ) : codigoErro === CODIGOS_ERRO.contaNaoVerificada && emailNaoVerificado ? (
              <div className="flex flex-col items-start gap-2">
                <span>Sua conta ainda não foi verificada. Enviamos um código para o seu e-mail.</span>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={reenviarCodigo.isPending}
                  onClick={() =>
                    reenviarCodigo.mutate(
                      { email: emailNaoVerificado },
                      { onSuccess: (envio) => navigate('/verificar-email', { state: envio }) },
                    )
                  }
                >
                  Verificar meu e-mail
                </Button>
              </div>
            ) : codigoErro === CODIGOS_ERRO.contaEmCarencia ? (
              <div className="flex flex-col items-start gap-2">
                <span>
                  Sua conta está em processo de exclusão
                  {carenciaAte ? ` e será excluída em ${dataCurta(carenciaAte)}` : ''}. Você pode cancelar a exclusão e voltar a usar o
                  Steely.
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={reativar.isPending}
                  onClick={() => {
                    const lido = loginSchema.safeParse(getValues())
                    if (lido.success)
                      reativar.mutate(lido.data, {
                        onSuccess: () => {
                          avisar('Exclusão cancelada. Que bom ter você de volta!')
                          concluir()
                        },
                      })
                  }}
                >
                  Cancelar exclusão e entrar
                </Button>
              </div>
            ) : (
              mensagemDeErro(erro)
            )}
          </ErroFormulario>
        )}

        <CampoTexto
          label="E-mail ou CPF"
          placeholder="Digite seu e-mail ou CPF"
          autoComplete="username"
          required
          error={formState.errors.identifier?.message}
          {...register('identifier')}
        />
        <div className="flex flex-col gap-2">
          <CampoSenha
            label="Senha"
            placeholder="Digite sua senha"
            autoComplete="current-password"
            required
            error={formState.errors.password?.message}
            {...register('password')}
          />
          <Link to="/recuperar-senha" className="touch-target flex items-center self-end text-13 font-medium text-brand hover:underline">
            Esqueci minha senha
          </Link>
        </div>

        {pedirCaptcha && <Captcha chave={chaveCaptcha} aoObterToken={setCaptchaToken} />}

        <Button type="submit" full loading={entrar.isPending} disabled={bloqueado || (pedirCaptcha && !captchaToken)}>
          Entrar na plataforma
        </Button>
        <Link to="/entrar-com-codigo" className="touch-target flex items-center justify-center text-14 font-medium text-brand hover:underline">
          Entrar com código temporário
        </Link>
      </form>

      <div className="flex items-center gap-3 text-13 text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-line" /> ou <span className="h-px flex-1 bg-line" />
      </div>

      <div className="flex flex-col gap-3">
        <Button asChild variant="secondary" full className="border-brand-line text-brand">
          <Link to="/criar-conta">Criar uma nova conta</Link>
        </Button>
        <Link to="/" className="touch-target flex items-center justify-center text-14 text-muted hover:text-fg">
          Explorar sem conta
        </Link>
      </div>

      <p className="text-center text-13 text-muted">
        Ao continuar, você concorda com nossos{' '}
        <Link to="/termos" className="underline underline-offset-2 hover:text-fg">
          Termos de Uso
        </Link>{' '}
        e{' '}
        <Link to="/privacidade" className="underline underline-offset-2 hover:text-fg">
          Política de Privacidade
        </Link>
        .
      </p>
    </>
  )
}
