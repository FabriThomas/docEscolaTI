import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { Mail } from 'lucide-react'
import type { CodigoEnviado } from '@steely/schemas'
import { useReenviarCodigoEmail, useVerificarEmail } from '@/api/auth'
import { mensagemDeErro } from '@/api/erros'
import { avisar } from '@/stores/avisos'
import { MetaPagina } from '@/components/MetaPagina'
import { AvisoDemonstracao, CabecalhoAuth, ConfirmacaoCodigo, Voltar } from './componentes'

/** Tela 03 · Verificar e-mail (STY001 passos 7 a 9; RN06 e RN08). */
export default function VerificarEmailPage() {
  const navigate = useNavigate()
  const envioInicial = useLocation().state as CodigoEnviado | null
  const [envio, setEnvio] = useState(envioInicial)
  const [codigo, setCodigo] = useState('')
  const verificar = useVerificarEmail()
  const reenviar = useReenviarCodigoEmail()

  if (!envio) return <Navigate to="/entrar" replace />

  return (
    <>
      <MetaPagina titulo="Verifique seu e-mail" />
      <Voltar para="/criar-conta" />
      <CabecalhoAuth icone={<Mail className="size-6" />} titulo="Verifique seu e-mail">
        Enviamos um código de verificação de 6 dígitos para <strong className="font-medium text-brand">{envio.email}</strong>
      </CabecalhoAuth>
      <AvisoDemonstracao />

      <ConfirmacaoCodigo
        codigo={codigo}
        aoMudarCodigo={setCodigo}
        aoConfirmar={(code) =>
          verificar.mutate(
            { email: envio.email, code },
            {
              onSuccess: () => {
                avisar('Conta criada! Você ganhou moedas de boas-vindas.')
                navigate('/perfil', { replace: true })
              },
              onError: () => setCodigo(''),
            },
          )
        }
        confirmando={verificar.isPending}
        erro={verificar.isError ? mensagemDeErro(verificar.error) : undefined}
        expiraEm={Date.parse(envio.expiresAt)}
        reenvioEm={Date.parse(envio.resendAvailableAt)}
        reenviando={reenviar.isPending}
        aoReenviar={() =>
          reenviar.mutate(
            { email: envio.email },
            {
              onSuccess: (novo) => {
                setEnvio(novo)
                verificar.reset()
                avisar('Enviamos um novo código.')
              },
              onError: (e) => avisar(mensagemDeErro(e), 'erro'),
            },
          )
        }
      />

      <p className="text-center text-13 text-muted">
        Não recebeu o e-mail? Verifique sua caixa de spam ou{' '}
        <Link to="/criar-conta" className="font-medium text-brand hover:underline">
          altere o endereço de e-mail
        </Link>
        .
      </p>
    </>
  )
}
