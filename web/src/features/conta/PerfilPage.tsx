import { Link } from 'react-router'
import { BadgeCheck, Coins, Handshake, Heart, Leaf, MapPin, Pencil, Recycle, ShieldCheck, Star, Tag } from 'lucide-react'
import type { Perfil } from '@steely/schemas'
import { usePerfil } from '@/api/conta'
import { mensagemDeErro } from '@/api/erros'
import { cn } from '@/lib/cn'
import { mesAno, numeroInteiro, quilos, umaCasa } from '@/lib/formatar'
import { MetaPagina } from '@/components/MetaPagina'
import { Button } from '@/components/ui/Button'
import { CaixaInfo, Cartao, Etiqueta, IconeEmCaixa, LinhaMenu, ListaCartao, Trilho } from '@/components/ui/Exibicao'
import { Avatar } from '@/components/ui/Marca'
import { Carregando } from '@/components/ui/Spinner'

const nomesCriterios: Record<Perfil['reputation']['criteria'][number]['key'], string> = {
  communication: 'Comunicação',
  punctuality: 'Pontualidade',
  listingAccuracy: 'Fidelidade do anúncio',
}

function Estrelas({ nota }: { nota: number }) {
  return (
    <span aria-hidden="true" className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cn('size-3.5 text-brand', i < Math.round(nota) ? 'fill-current' : '')} />
      ))}
    </span>
  )
}

function Reputacao({ perfil }: { perfil: Perfil }) {
  const { average, reviews, deals, criteria } = perfil.reputation
  return (
    <Cartao aria-labelledby="titulo-reputacao" className="flex flex-col gap-4 p-4">
      <h2 id="titulo-reputacao" className="sr-only">
        Reputação
      </h2>
      {average === null ? (
        <p className="text-14 text-muted">Ainda sem avaliações. Elas aparecem aqui depois das primeiras negociações concluídas.</p>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <span className="font-title text-24 font-bold">
              {umaCasa(average)}
              <span className="sr-only"> de 5</span>
            </span>
            <span className="flex flex-col gap-1">
              <Estrelas nota={average} />
              <span className="text-11 font-medium text-muted">
                {numeroInteiro(reviews)} avaliações · {numeroInteiro(deals)} negociações
              </span>
            </span>
          </div>
          <ul aria-label="Notas por critério" className="flex flex-col gap-3">
            {criteria.map((c) => (
              <li key={c.key} className="flex flex-col gap-1">
                <span className="flex items-center justify-between">
                  <span className="text-11 font-medium text-muted">{nomesCriterios[c.key]}</span>
                  <span className="text-13 font-semibold">{umaCasa(c.average)}</span>
                </span>
                <Trilho percentual={(c.average / 5) * 100} />
              </li>
            ))}
          </ul>
        </>
      )}
    </Cartao>
  )
}

function SelosEsg({ perfil }: { perfil: Perfil }) {
  const { badges, kgAvoided } = perfil.esg
  return (
    <section aria-labelledby="titulo-selos" className="flex flex-col gap-2">
      <h2 id="titulo-selos" className="font-body text-13 font-semibold">
        Selos ESG
      </h2>
      {badges.length === 0 && kgAvoided === 0 ? (
        <p className="text-13 text-muted">Venda, doe ou recicle peças para ganhar selos.</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {badges.map((b) => (
            <li key={b.id}>
              <Etiqueta tom="esg" icon={b.kind === 'recycler' ? <Recycle className="size-3" /> : <Heart className="size-3" />}>
                {b.kind === 'recycler' ? 'Reciclador' : 'Doador'}
              </Etiqueta>
            </li>
          ))}
          {kgAvoided > 0 && (
            <li>
              <Etiqueta tom="esg" icon={<Leaf className="size-3" />}>
                {quilos(kgAvoided)} evitados
              </Etiqueta>
            </li>
          )}
        </ul>
      )}
    </section>
  )
}

/** Tela 052 · Meu Perfil (STY011; RN01 e RN02). */
export default function PerfilPage() {
  const { data: perfil, isPending, isError, error, refetch } = usePerfil()

  if (isPending) return <Carregando texto="Carregando seu perfil…" />
  if (isError) {
    return (
      <CaixaInfo tom="danger" role="alert">
        <div className="flex flex-col items-start gap-2 text-fg">
          {mensagemDeErro(error, 'Não foi possível carregar seu perfil.')}
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Tentar de novo
          </Button>
        </div>
      </CaixaInfo>
    )
  }

  const verificacoes = [perfil.emailVerified && 'E-mail verificado', perfil.twoFactorEnabled && '2FA ativo'].filter(Boolean)

  const destaques = [
    {
      rotulo: 'Reputação',
      valor: perfil.reputation.average === null ? '—' : umaCasa(perfil.reputation.average),
      detalhe: perfil.reputation.average === null ? 'sem avaliações' : `${numeroInteiro(perfil.reputation.reviews)} avaliações`,
      icone: <Star className="size-4" />,
      tom: 'brand' as const,
    },
    { rotulo: 'Negociações', valor: numeroInteiro(perfil.reputation.deals), detalhe: 'concluídas', icone: <Handshake className="size-4" />, tom: 'brand' as const },
    { rotulo: 'Moedas', valor: numeroInteiro(perfil.coins), detalhe: 'disponíveis', icone: <Coins className="size-4" />, tom: 'brand' as const },
    { rotulo: 'Impacto ESG', valor: quilos(perfil.esg.kgAvoided), detalhe: 'de resíduo evitado', icone: <Leaf className="size-4" />, tom: 'esg' as const },
  ]

  return (
    <div className="flex flex-col gap-6">
      <MetaPagina titulo="Meu perfil" privada />
      <h1 className="font-title text-24 font-bold">Perfil</h1>

      <Cartao className="flex flex-col gap-6 p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <section aria-label="Resumo do perfil" className="flex items-center gap-4">
            <Avatar url={perfil.avatarUrl} nome={perfil.displayName} tamanho="lg" />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="font-title text-20 font-bold">{perfil.displayName}</p>
              <p className="flex items-center gap-1.5 text-13 text-muted">
                <MapPin aria-hidden="true" className="size-3.5 text-icon" />
                {perfil.region || 'Região não informada'} · desde {mesAno(perfil.memberSince)}
              </p>
              {verificacoes.length > 0 && (
                <p className="flex items-center gap-1 text-13 font-medium text-brand">
                  <BadgeCheck aria-hidden="true" className="size-3.5" />
                  {verificacoes.join(' · ')}
                </p>
              )}
            </div>
          </section>
          <Button asChild variant="secondary" size="sm" className="self-start md:self-center">
            <Link to="/perfil/editar">
              <Pencil aria-hidden="true" className="size-4" />
              Editar perfil
            </Link>
          </Button>
        </div>
        {perfil.bio && <p className="max-w-prose text-14 text-muted">{perfil.bio}</p>}

        {/* Números de destaque (.kpi da tela 050) */}
        <ul aria-label="Resumo em números" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {destaques.map((d) => (
            <li key={d.rotulo} className="flex flex-col gap-1.5 rounded-md border border-line bg-app p-4">
              <span className="flex items-center gap-2 text-11 font-medium text-muted">
                <IconeEmCaixa tom={d.tom} className="size-7 rounded-sm">
                  {d.icone}
                </IconeEmCaixa>
                {d.rotulo}
              </span>
              <span className={cn('font-title text-20 font-bold', d.tom === 'esg' ? 'text-esg' : 'text-fg')}>{d.valor}</span>
              <span className="text-11 font-medium text-muted">{d.detalhe}</span>
            </li>
          ))}
        </ul>
      </Cartao>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-4">
          <h2 className="font-title text-18 font-bold">Avaliações</h2>
          <Reputacao perfil={perfil} />
          <SelosEsg perfil={perfil} />
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="font-title text-18 font-bold">Atalhos</h2>
          <ListaCartao rotulo="Atalhos da conta">
            <li>
              <LinhaMenu
                to="/anuncios"
                icon={<Tag className="size-4" />}
                titulo="Meus anúncios"
                subtitulo={`${perfil.listings.active} ativos · ${perfil.listings.paused} pausado${perfil.listings.paused === 1 ? '' : 's'}`}
              />
            </li>
            <li>
              <LinhaMenu to="/carteira" icon={<Coins className="size-4" />} titulo="Carteira" subtitulo={`${numeroInteiro(perfil.coins)} moedas disponíveis`} />
            </li>
            <li>
              <LinhaMenu to="/impacto-esg" tom="esg" icon={<Leaf className="size-4" />} titulo="Meu impacto ESG" subtitulo="Ver dashboard e certificado" />
            </li>
            <li>
              <LinhaMenu to="/seguranca" icon={<ShieldCheck className="size-4" />} titulo="Segurança da conta" subtitulo="Senha, 2FA e sessões" />
            </li>
          </ListaCartao>
        </div>
      </div>
    </div>
  )
}
