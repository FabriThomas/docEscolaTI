import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CODIGOS_ERRO, cadastroSchema, formatarCpf, formatarData, type CadastroPayload } from '@steely/schemas'
import { useCadastrar } from '@/api/auth'
import { mensagemDeErro } from '@/api/erros'
import { ApiError } from '@/api/http'
import { MetaPagina } from '@/components/MetaPagina'
import { Button } from '@/components/ui/Button'
import { CampoSenha, CampoTexto } from '@/components/ui/Campo'
import { CaixaSelecao } from '@/components/ui/Selecao'
import { Captcha } from './Captcha'
import { AvisoDemonstracao, CabecalhoAuth, ErroFormulario, ForcaSenha, Voltar } from './componentes'

const camposApi = ['fullName', 'email', 'cpf', 'birthDate', 'password'] as const

/** Tela 02 · Criar conta (STY001, STY004; RN01 a RN07). */
export default function CriarContaPage() {
  const navigate = useNavigate()
  const cadastrar = useCadastrar()
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [chaveCaptcha, setChaveCaptcha] = useState(0)
  const [semCaptcha, setSemCaptcha] = useState(false)

  const { register, handleSubmit, control, formState, setError } = useForm({
    resolver: zodResolver(cadastroSchema),
    mode: 'onTouched',
    defaultValues: { fullName: '', email: '', cpf: '', birthDate: '', password: '', passwordConfirmation: '', acceptTerms: false },
  })
  const senha = useWatch({ control, name: 'password' }) ?? ''
  const erros = formState.errors

  function enviar(dados: CadastroPayload) {
    if (!captchaToken) {
      setSemCaptcha(true)
      return
    }
    cadastrar.mutate(
      { ...dados, captchaToken },
      {
        onSuccess: (envio) => navigate('/verificar-email', { state: envio }),
        onError: (e) => {
          if (e instanceof ApiError) {
            for (const [campo, mensagem] of Object.entries(e.errosPorCampo)) {
              if ((camposApi as readonly string[]).includes(campo)) setError(campo as (typeof camposApi)[number], { message: mensagem })
            }
          }
        },
        onSettled: () => setChaveCaptcha((n) => n + 1),
      },
    )
  }

  const duplicado = cadastrar.error instanceof ApiError && cadastrar.error.code === CODIGOS_ERRO.emailOuCpfEmUso

  return (
    <>
      <MetaPagina titulo="Criar conta" descricao="Crie sua conta no Steely e comece a comprar e vender hardware reaproveitável." />
      <Voltar para="/entrar" rotulo="Voltar para o login" />
      <CabecalhoAuth titulo="Criar sua conta">Preencha seus dados para começar a conectar hardware com propósito.</CabecalhoAuth>
      <AvisoDemonstracao />

      <form noValidate onSubmit={handleSubmit(enviar)} className="flex flex-col gap-5">
        {cadastrar.isError && (
          <ErroFormulario>
            {duplicado ? (
              <>
                Já existe uma conta com este e-mail ou CPF.{' '}
                <Link to="/entrar" className="font-semibold text-brand underline underline-offset-2">
                  Entrar
                </Link>{' '}
                ou{' '}
                <Link to="/recuperar-senha" className="font-semibold text-brand underline underline-offset-2">
                  recuperar a senha
                </Link>
                .
              </>
            ) : (
              mensagemDeErro(cadastrar.error)
            )}
          </ErroFormulario>
        )}

        <CampoTexto label="Nome completo" placeholder="Seu nome completo" autoComplete="name" required error={erros.fullName?.message} {...register('fullName')} />
        <CampoTexto label="E-mail" type="email" placeholder="seu@email.com" autoComplete="email" required error={erros.email?.message} {...register('email')} />

        <div className="grid gap-5 md:grid-cols-2">
          <Controller
            control={control}
            name="cpf"
            render={({ field }) => (
              <CampoTexto
                label="CPF"
                placeholder="000.000.000-00"
                inputMode="numeric"
                required
                error={erros.cpf?.message}
                name={field.name}
                ref={field.ref}
                value={field.value}
                onBlur={field.onBlur}
                onChange={(e) => field.onChange(formatarCpf(e.target.value))}
              />
            )}
          />
          <Controller
            control={control}
            name="birthDate"
            render={({ field }) => (
              <CampoTexto
                label="Nascimento"
                placeholder="DD/MM/AAAA"
                inputMode="numeric"
                autoComplete="bday"
                required
                error={erros.birthDate?.message}
                hint="É preciso ter 18 anos ou mais."
                name={field.name}
                ref={field.ref}
                value={field.value}
                onBlur={field.onBlur}
                onChange={(e) => field.onChange(formatarData(e.target.value))}
              />
            )}
          />
        </div>

        <div className="flex flex-col gap-3">
          <CampoSenha label="Senha" placeholder="Crie uma senha" autoComplete="new-password" required error={erros.password?.message} {...register('password')} />
          <ForcaSenha senha={senha} />
        </div>
        <CampoSenha
          label="Confirmar senha"
          placeholder="Repita sua senha"
          autoComplete="new-password"
          required
          error={erros.passwordConfirmation?.message}
          {...register('passwordConfirmation')}
        />

        <div className="flex flex-col gap-2">
          <Captcha
            chave={chaveCaptcha}
            aoObterToken={(token) => {
              setCaptchaToken(token)
              if (token) setSemCaptcha(false)
            }}
          />
          {semCaptcha && <p className="text-13 text-danger">Conclua a verificação acima para criar a conta.</p>}
        </div>

        <Controller
          control={control}
          name="acceptTerms"
          render={({ field }) => (
            <CaixaSelecao checked={field.value} onCheckedChange={field.onChange} name={field.name} error={erros.acceptTerms?.message}>
              Li e aceito os{' '}
              <Link to="/termos" target="_blank" rel="noopener" className="font-semibold text-brand underline underline-offset-2">
                Termos de Uso<span className="sr-only"> (abre em nova aba)</span>
              </Link>{' '}
              e a{' '}
              <Link to="/privacidade" target="_blank" rel="noopener" className="font-semibold text-brand underline underline-offset-2">
                Política de Privacidade<span className="sr-only"> (abre em nova aba)</span>
              </Link>{' '}
              do Steely.
            </CaixaSelecao>
          )}
        />

        <Button type="submit" full loading={cadastrar.isPending}>
          Criar conta
        </Button>
      </form>

      <p className="text-center text-14 text-muted">
        Já tem conta?{' '}
        <Link to="/entrar" className="font-semibold text-brand hover:underline">
          Entrar
        </Link>
      </p>
    </>
  )
}
