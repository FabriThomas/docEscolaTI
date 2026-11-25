import { Link, useNavigate } from 'react-router'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronLeft, TriangleAlert } from 'lucide-react'
import { CODIGOS_ERRO, PALAVRA_EXCLUSAO, excluirContaSchema, type ExcluirContaInput } from '@steely/schemas'
import { useEncerrarSessaoLocal, usePerfil, useSolicitarExclusao } from '@/api/conta'
import { mensagemDeErro } from '@/api/erros'
import { ApiError } from '@/api/http'
import { dataCurta, numeroInteiro } from '@/lib/formatar'
import { avisar } from '@/stores/avisos'
import { MetaPagina } from '@/components/MetaPagina'
import { Button } from '@/components/ui/Button'
import { CampoSenha, CampoTexto } from '@/components/ui/Campo'
import { CaixaInfo, Cartao, IconeEmCaixa } from '@/components/ui/Exibicao'
import { CaixaSelecao } from '@/components/ui/Selecao'
import { Carregando } from '@/components/ui/Spinner'

const consequencias = [
  'Seus anúncios serão removidos e seu perfil deixa de aparecer.',
  'Negociações, leilões e reclamações em andamento precisam ser concluídos antes.',
  'O saldo de moedas precisa ser usado ou resgatado antes do pedido.',
  'Por 30 dias, você pode cancelar a exclusão entrando de novo na sua conta. Depois disso, ela não pode ser desfeita.',
  'Avaliações que você fez continuam visíveis, com o autor “Usuário removido”. Dados fiscais ficam guardados pelo prazo legal.',
]

/** Tela 056 · Solicitar exclusão de conta (STY010; RN01 a RN04; ADR-07). */
export default function ExcluirContaPage() {
  const navigate = useNavigate()
  const { data: perfil, isPending } = usePerfil()
  const excluir = useSolicitarExclusao()
  const encerrarLocal = useEncerrarSessaoLocal()
  const { register, handleSubmit, control, formState, setError } = useForm({
    resolver: zodResolver(excluirContaSchema),
    mode: 'onTouched',
    defaultValues: { acknowledge: false, confirmation: '', password: '' },
  })

  if (isPending) return <Carregando />
  const temMoedas = (perfil?.coins ?? 0) > 0

  function enviar(dados: ExcluirContaInput) {
    excluir.mutate(
      { password: dados.password, confirmation: dados.confirmation },
      {
        onSuccess: ({ effectiveAt }) => {
          navigate('/', { replace: true })
          encerrarLocal()
          avisar(`Pedido registrado. Sua conta será excluída em ${dataCurta(effectiveAt)}. Até lá, entre de novo para cancelar.`)
        },
        onError: (e) => {
          if (e instanceof ApiError && e.errosPorCampo.password) setError('password', { message: e.errosPorCampo.password })
        },
      },
    )
  }

  const bloqueadoPelaApi = excluir.error instanceof ApiError && excluir.error.code === CODIGOS_ERRO.exclusaoBloqueada

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <MetaPagina titulo="Excluir conta" privada />
      <div className="flex items-center gap-3">
        <Link to="/seguranca" aria-label="Voltar para segurança" className="touch-target flex items-center justify-center rounded-sm border border-line hover:border-control">
          <ChevronLeft aria-hidden="true" className="size-4" />
        </Link>
        <h1 className="font-title text-24 font-bold">Excluir conta</h1>
      </div>

      <Cartao className="flex flex-col gap-4 border-danger-line p-5">
        <div className="flex items-center gap-3">
          <IconeEmCaixa tom="danger">
            <TriangleAlert className="size-5" />
          </IconeEmCaixa>
          <p className="font-title text-16 font-medium">O que acontece ao excluir</p>
        </div>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-14 text-muted">
          {consequencias.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </Cartao>

      {temMoedas && (
        <CaixaInfo tom="danger" role="status">
          <span className="text-fg">
            Você ainda tem <strong>{numeroInteiro(perfil?.coins ?? 0)} moedas</strong>. Use ou resgate o saldo na{' '}
            <Link to="/carteira" className="font-semibold text-brand underline underline-offset-2">
              Carteira
            </Link>{' '}
            antes de pedir a exclusão.
          </span>
        </CaixaInfo>
      )}

      <form noValidate onSubmit={handleSubmit(enviar)} className="flex flex-col gap-5">
        {excluir.isError && !(excluir.error instanceof ApiError && excluir.error.errosPorCampo.password) && (
          <CaixaInfo tom="danger" role="alert">
            <span className="text-fg">{bloqueadoPelaApi ? excluir.error.message : mensagemDeErro(excluir.error)}</span>
          </CaixaInfo>
        )}
        <Controller
          control={control}
          name="acknowledge"
          render={({ field }) => (
            <CaixaSelecao checked={field.value} onCheckedChange={field.onChange} name={field.name} error={formState.errors.acknowledge?.message}>
              Entendo as consequências e quero continuar.
            </CaixaSelecao>
          )}
        />
        <CampoTexto
          label={`Digite ${PALAVRA_EXCLUSAO} para confirmar`}
          required
          autoComplete="off"
          spellCheck={false}
          placeholder={PALAVRA_EXCLUSAO}
          error={formState.errors.confirmation?.message}
          {...register('confirmation')}
        />
        <CampoSenha label="Senha atual" required autoComplete="current-password" error={formState.errors.password?.message} {...register('password')} />
        <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
          <Button asChild variant="secondary">
            <Link to="/seguranca">Voltar</Link>
          </Button>
          <Button type="submit" variant="danger" loading={excluir.isPending} disabled={temMoedas}>
            Solicitar exclusão
          </Button>
        </div>
      </form>
    </div>
  )
}
