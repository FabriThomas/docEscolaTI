import { useId, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ChevronRight, KeyRound, Lock, LogOut, Mail, Monitor, ShieldAlert, ShieldCheck, Smartphone, Sparkles } from 'lucide-react'
import type { SessaoAtiva } from '@steely/schemas'
import { useEncerrarSessao, useEncerrarSessaoLocal, useGerarCodigosRecuperacao, useSairDeTodos, useSeguranca } from '@/api/conta'
import { mensagemDeErro } from '@/api/erros'
import { haQuanto } from '@/lib/formatar'
import { avisar } from '@/stores/avisos'
import { MetaPagina } from '@/components/MetaPagina'
import { Button } from '@/components/ui/Button'
import { CaixaInfo, Etiqueta, IconeEmCaixa, LinhaMenu, ListaCartao, TituloGrupo } from '@/components/ui/Exibicao'
import { Confirmacao, Modal } from '@/components/ui/Modal'
import { Interruptor } from '@/components/ui/Selecao'
import { Carregando } from '@/components/ui/Spinner'
import { DialogoAtivar2fa, DialogoDesativar2fa, DialogoTrocarSenha, ListaCodigos } from './DialogosSeguranca'

function LinhaSessao({ sessao, aoEncerrar }: { sessao: SessaoAtiva; aoEncerrar: (s: SessaoAtiva) => void }) {
  const Icone = sessao.kind === 'mobile' ? Smartphone : Monitor
  return (
    <LinhaMenu
      icon={<Icone className="size-4" />}
      tom={sessao.current ? 'brand' : 'muted'}
      titulo={sessao.current ? `${sessao.device} · este aparelho` : sessao.device}
      subtitulo={`${sessao.location} · ${haQuanto(sessao.lastActiveAt)}`}
      direita={
        sessao.current ? (
          <Etiqueta>Atual</Etiqueta>
        ) : (
          <Button variant="ghost" className="text-13 text-danger" onClick={() => aoEncerrar(sessao)} aria-label={`Encerrar sessão em ${sessao.device}`}>
            Encerrar
          </Button>
        )
      }
    />
  )
}

/** Tela 054 · Configurações de segurança (STY007, STY008 e STY009). */
export default function SegurancaPage() {
  const navigate = useNavigate()
  const { data, isPending, isError, error, refetch } = useSeguranca()
  const encerrar = useEncerrarSessao()
  const sairDeTodos = useSairDeTodos()
  const encerrarLocal = useEncerrarSessaoLocal()
  const gerarCodigos = useGerarCodigosRecuperacao()
  const ids = { doisFatores: useId(), doisFatoresDesc: useId(), sessoes: useId(), acesso: useId() }

  const [trocarSenha, setTrocarSenha] = useState(false)
  const [ativar2fa, setAtivar2fa] = useState(false)
  const [desativar2fa, setDesativar2fa] = useState(false)
  const [confirmarCodigos, setConfirmarCodigos] = useState(false)
  const [sessaoParaEncerrar, setSessaoParaEncerrar] = useState<SessaoAtiva | null>(null)
  const [confirmarSairTodos, setConfirmarSairTodos] = useState(false)

  if (isPending) return <Carregando texto="Carregando segurança da conta…" />
  if (isError) {
    return (
      <CaixaInfo tom="danger" role="alert">
        <div className="flex flex-col items-start gap-2 text-fg">
          {mensagemDeErro(error, 'Não foi possível carregar as configurações de segurança.')}
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Tentar de novo
          </Button>
        </div>
      </CaixaInfo>
    )
  }

  const ativo = data.twoFactor.enabled
  const senhaTrocada = `senha trocada ${haQuanto(data.passwordChangedAt)}`

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <MetaPagina titulo="Segurança" privada />
      <header className="flex flex-col gap-1">
        <h1 className="font-title text-24 font-bold">Segurança</h1>
        <p className="text-14 text-muted">Senha, verificação em duas etapas e aparelhos conectados.</p>
      </header>

      <section
        aria-label="Situação da conta"
        className={`flex items-center gap-3 rounded-lg border p-4 ${ativo ? 'border-brand-line bg-brand-subtle' : 'border-danger-line bg-danger-soft'}`}
      >
        <IconeEmCaixa tom={ativo ? 'brand' : 'danger'} className="size-11">
          {ativo ? <ShieldCheck className="size-6" strokeWidth={1.75} /> : <ShieldAlert className="size-6" strokeWidth={1.75} />}
        </IconeEmCaixa>
        <div className="flex flex-col gap-0.5">
          <p className="font-title text-16 font-medium">{ativo ? 'Sua conta está protegida' : 'Proteja melhor sua conta'}</p>
          <p className="text-13 text-muted">{ativo ? `2FA ativo · ${senhaTrocada}` : `Ative a verificação em duas etapas · ${senhaTrocada}`}</p>
        </div>
      </section>

      <section aria-labelledby={ids.acesso} className="flex flex-col gap-3">
        <TituloGrupo id={ids.acesso}>Acesso</TituloGrupo>
        <ListaCartao rotuladoPor={ids.acesso}>
          <li>
            <LinhaMenu
              icon={<Smartphone className="size-4" />}
              tom={ativo ? 'brand' : 'muted'}
              titulo="Verificação em duas etapas"
              tituloId={ids.doisFatores}
              subtitulo={ativo ? 'Aplicativo autenticador' : 'Desativada'}
              subtituloId={ids.doisFatoresDesc}
              direita={
                <Interruptor
                  checked={ativo}
                  labelledBy={ids.doisFatores}
                  describedBy={ids.doisFatoresDesc}
                  onCheckedChange={(ligar) => (ligar ? setAtivar2fa(true) : setDesativar2fa(true))}
                />
              }
            />
          </li>
          <li>
            <LinhaMenu icon={<Lock className="size-4" />} titulo="Alterar senha" subtitulo="Mínimo de 10 caracteres" onClick={() => setTrocarSenha(true)} />
          </li>
          <li>
            {ativo ? (
              <LinhaMenu icon={<Sparkles className="size-4" />} titulo="Códigos de recuperação" subtitulo="Gerar um novo conjunto" onClick={() => setConfirmarCodigos(true)} />
            ) : (
              <LinhaMenu icon={<KeyRound className="size-4" />} titulo="Códigos de recuperação" subtitulo="Ative a verificação em duas etapas primeiro" />
            )}
          </li>
        </ListaCartao>
      </section>

      <section aria-labelledby={ids.sessoes} className="flex flex-col gap-3">
        <TituloGrupo id={ids.sessoes} aside={`${data.sessions.length} ${data.sessions.length === 1 ? 'aparelho' : 'aparelhos'}`}>
          Sessões ativas
        </TituloGrupo>
        <ListaCartao rotuladoPor={ids.sessoes}>
          {data.sessions.map((s) => (
            <li key={s.id}>
              <LinhaSessao sessao={s} aoEncerrar={setSessaoParaEncerrar} />
            </li>
          ))}
        </ListaCartao>
        <Button variant="danger" full className="md:w-auto md:self-start" icon={<LogOut aria-hidden="true" className="size-4" />} onClick={() => setConfirmarSairTodos(true)}>
          Sair de todos os aparelhos
        </Button>
      </section>

      <p className="flex items-start gap-1.5 text-11 font-medium text-muted">
        <Mail aria-hidden="true" className="mt-px size-3.5 shrink-0 text-icon" />
        Toda mudança de senha, 2FA ou sessão é registrada e avisada por e-mail.
      </p>

      <Link to="/conta/excluir" className="flex min-h-11 items-center justify-between rounded-sm text-13 font-semibold text-danger hover:underline">
        Solicitar exclusão da conta
        <ChevronRight aria-hidden="true" className="size-4" />
      </Link>

      <DialogoTrocarSenha aberto={trocarSenha} aoMudar={setTrocarSenha} />
      <DialogoAtivar2fa aberto={ativar2fa} aoMudar={setAtivar2fa} />
      <DialogoDesativar2fa aberto={desativar2fa} aoMudar={setDesativar2fa} />

      <Confirmacao
        aberto={confirmarCodigos}
        aoMudar={setConfirmarCodigos}
        titulo="Gerar novos códigos de recuperação?"
        descricao="Os códigos anteriores deixam de funcionar."
        confirmar="Gerar novos códigos"
        carregando={gerarCodigos.isPending}
        aoConfirmar={() =>
          gerarCodigos.mutate(undefined, {
            onSettled: () => setConfirmarCodigos(false),
            onError: (e) => avisar(mensagemDeErro(e), 'erro'),
          })
        }
      />
      <Modal aberto={Boolean(gerarCodigos.data)} aoMudar={(v) => !v && gerarCodigos.reset()} titulo="Novos códigos de recuperação">
        {gerarCodigos.data && <ListaCodigos codigos={gerarCodigos.data.codes} aoConcluir={() => gerarCodigos.reset()} />}
      </Modal>

      <Confirmacao
        aberto={Boolean(sessaoParaEncerrar)}
        aoMudar={(v) => !v && setSessaoParaEncerrar(null)}
        titulo="Encerrar esta sessão?"
        descricao={`O aparelho “${sessaoParaEncerrar?.device ?? ''}” vai precisar entrar de novo.`}
        confirmar="Encerrar sessão"
        perigo
        carregando={encerrar.isPending}
        aoConfirmar={() =>
          sessaoParaEncerrar &&
          encerrar.mutate(sessaoParaEncerrar.id, {
            onSuccess: () => avisar('Sessão encerrada.'),
            onError: (e) => avisar(mensagemDeErro(e), 'erro'),
            onSettled: () => setSessaoParaEncerrar(null),
          })
        }
      />
      <Confirmacao
        aberto={confirmarSairTodos}
        aoMudar={setConfirmarSairTodos}
        titulo="Sair de todos os aparelhos?"
        descricao="Todas as sessões serão encerradas, inclusive esta. Você vai precisar entrar de novo."
        confirmar="Sair de todos"
        perigo
        carregando={sairDeTodos.isPending}
        aoConfirmar={() =>
          sairDeTodos.mutate(undefined, {
            onSuccess: () => {
              navigate('/entrar', { replace: true })
              encerrarLocal()
              avisar('Você saiu de todos os aparelhos.')
            },
            onError: (e) => avisar(mensagemDeErro(e), 'erro'),
            onSettled: () => setConfirmarSairTodos(false),
          })
        }
      />
    </div>
  )
}
