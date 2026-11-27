import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Lock, MailCheck } from 'lucide-react'
import { emailFormSchema, type CodigoEnviado } from '@steely/schemas'
import { useEntrarComCodigo, useSolicitarCodigo } from '@/api/auth'
import { mensagemDeErro } from '@/api/erros'
import { MetaPagina } from '@/components/MetaPagina'
import { Button } from '@/components/ui/Button'
import { CampoTexto } from '@/components/ui/Campo'
import { CaixaInfo } from '@/components/ui/Exibicao'
import { Captcha } from './Captcha'
import { AvisoDemonstracao, CabecalhoAuth, ConfirmacaoCodigo, ErroFormulario, Voltar } from './componentes'

/** Tela 05 · Entrar com código (STY006; RN01: código de uso único com validade). */
export default function EntrarComCodigoPage() {
  const navigate = useNavigate()
  const destino = (useLocation().state as { de?: string } | null)?.de ?? '/perfil'
  const solicitar = useSolicitarCodigo()
  const entrar = useEntrarComCodigo()
  const [envio, setEnvio] = useState<CodigoEnviado | null>(null)
  const [codigo, setCodigo] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [chaveCaptcha, setChaveCaptcha] = useState(0)
  const { register, handleSubmit, formState } = useForm({ resolver: zodResolver(emailFormSchema), mode: 'onTouched' })

  if (envio) {
    return (
      <>
        <MetaPagina titulo="Digite o código" />
        <Button
          variant="ghost"
          className="w-fit text-14"
          onClick={() => {
            setEnvio(null)
            setCodigo('')
            entrar.reset()
          }}
        >
          Trocar e-mail
        </Button>
        <CabecalhoAuth icone={<MailCheck className="size-6" />} titulo="Digite o código">
          Se <strong className="font-medium text-brand">{envio.email}</strong> tiver uma conta no Steely, enviamos um código de 6 números.
        </CabecalhoAuth>
        <AvisoDemonstracao />
        <ConfirmacaoCodigo
          codigo={codigo}
          aoMudarCodigo={setCodigo}
          rotuloBotao="Entrar"
          aoConfirmar={(code) =>
            entrar.mutate({ email: envio.email, code }, { onSuccess: () => navigate(destino, { replace: true }), onError: () => setCodigo('') })
          }
          confirmando={entrar.isPending}
          erro={entrar.isError ? mensagemDeErro(entrar.error) : undefined}
          expiraEm={Date.parse(envio.expiresAt)}
          reenvioEm={Date.parse(envio.resendAvailableAt)}
          // Pedir de novo exige um novo captcha (ADR-21): volta para a etapa do e-mail.
          aoReenviar={() => {
            setEnvio(null)
            setCodigo('')
            entrar.reset()
          }}
        />
      </>
    )
  }

  return (
    <>
      <MetaPagina titulo="Entrar com código" descricao="Entre no Steely sem senha, com um código enviado ao seu e-mail." />
      <Voltar para="/entrar" />
      <CabecalhoAuth icone={<Lock className="size-6" />} titulo="Entrar com código">
        Acesse sua conta sem senha. Enviaremos um código de uso único para o e-mail cadastrado.
      </CabecalhoAuth>
      <CaixaInfo>O código é válido por uma única sessão e expira em 10 minutos após o envio.</CaixaInfo>

      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={handleSubmit(({ email }) =>
          solicitar.mutate({ email, captchaToken }, { onSuccess: setEnvio, onSettled: () => setChaveCaptcha((n) => n + 1) }),
        )}
      >
        {solicitar.isError && <ErroFormulario>{mensagemDeErro(solicitar.error)}</ErroFormulario>}
        <CampoTexto
          label="E-mail"
          type="email"
          placeholder="Digite seu e-mail cadastrado"
          autoComplete="email"
          required
          error={formState.errors.email?.message}
          {...register('email')}
        />
        <Captcha chave={chaveCaptcha} aoObterToken={setCaptchaToken} />
        <Button type="submit" full loading={solicitar.isPending} disabled={!captchaToken}>
          Enviar código
        </Button>
      </form>

      <p className="text-center text-14 text-muted">
        Prefere usar senha?{' '}
        <Link to="/entrar" className="font-semibold text-fg hover:underline">
          Entrar
        </Link>
      </p>
    </>
  )
}
