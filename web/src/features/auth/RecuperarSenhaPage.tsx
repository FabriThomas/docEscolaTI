import { useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Lock, MailCheck } from 'lucide-react'
import { emailFormSchema } from '@steely/schemas'
import { useRecuperarSenha } from '@/api/auth'
import { mensagemDeErro } from '@/api/erros'
import { DEMO, mocksAtivos } from '@/mocks/demo'
import { MetaPagina } from '@/components/MetaPagina'
import { Button } from '@/components/ui/Button'
import { CampoTexto } from '@/components/ui/Campo'
import { Captcha } from './Captcha'
import { CabecalhoAuth, ErroFormulario, Voltar } from './componentes'

/** Tela 04 · Recuperar senha (STY005 passos 1 a 4; RN01: mensagem sempre neutra). */
export default function RecuperarSenhaPage() {
  const recuperar = useRecuperarSenha()
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [chaveCaptcha, setChaveCaptcha] = useState(0)
  const [enviadoPara, setEnviadoPara] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm({ resolver: zodResolver(emailFormSchema), mode: 'onTouched' })

  if (enviadoPara) {
    return (
      <>
        <MetaPagina titulo="Verifique seu e-mail" />
        <CabecalhoAuth icone={<MailCheck className="size-6" />} titulo="Verifique seu e-mail">
          Se houver uma conta com <strong className="font-medium text-fg">{enviadoPara}</strong>, você vai receber um link para criar uma
          nova senha. O link vale por tempo limitado e só pode ser usado uma vez.
        </CabecalhoAuth>
        <Button asChild full>
          <Link to="/entrar">Voltar para o login</Link>
        </Button>
        {mocksAtivos && (
          <Button asChild variant="secondary" full>
            <Link to={`/redefinir-senha?token=${DEMO.tokenRedefinicao}`}>Abrir o link de demonstração</Link>
          </Button>
        )}
      </>
    )
  }

  return (
    <>
      <MetaPagina titulo="Recuperar senha" descricao="Recupere o acesso à sua conta Steely." />
      <Voltar para="/entrar" />
      <CabecalhoAuth icone={<Lock className="size-6" />} titulo="Recuperar senha">
        Informe o e-mail cadastrado na sua conta. Enviaremos um link para redefinir sua senha.
      </CabecalhoAuth>

      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={handleSubmit(({ email }) =>
          recuperar.mutate(
            { email, captchaToken },
            { onSuccess: () => setEnviadoPara(email), onSettled: () => setChaveCaptcha((n) => n + 1) },
          ),
        )}
      >
        {recuperar.isError && <ErroFormulario>{mensagemDeErro(recuperar.error)}</ErroFormulario>}
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
        <Button type="submit" full loading={recuperar.isPending} disabled={!captchaToken}>
          Enviar link de redefinição
        </Button>
      </form>

      <p className="text-center text-14 text-muted">
        Lembrou a senha?{' '}
        <Link to="/entrar" className="font-semibold text-fg hover:underline">
          Entrar
        </Link>
      </p>
    </>
  )
}
