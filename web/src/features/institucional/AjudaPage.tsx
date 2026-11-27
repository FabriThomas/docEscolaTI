import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Accordion, ToggleGroup } from 'radix-ui'
import { ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/cn'
import { MetaPagina } from '@/components/MetaPagina'
import { classeEntrada } from '@/components/ui/Campo'

type Categoria = 'Conta' | 'Anúncios' | 'Compras'
type Pergunta = { id: string; categoria: Categoria; pergunta: string; resposta: ReactNode }

const linkClasse = 'font-semibold text-brand underline underline-offset-2'

/** Respostas alinhadas às regras de negócio e aos ADRs (moderação, escrow, carência). */
const perguntas: Pergunta[] = [
  {
    id: 'moderacao',
    categoria: 'Anúncios',
    pergunta: 'Como funciona a moderação?',
    resposta: 'Um sistema confere fotos e texto. Se houver dúvida, um revisor humano analisa em até 24 h.',
  },
  {
    id: 'pagamento',
    categoria: 'Compras',
    pergunta: 'Como recebo meu pagamento?',
    resposta: 'O valor da compra fica retido pelo Steely e é liberado para quem vendeu quando a entrega é confirmada pelo QR Code.',
  },
  {
    id: 'cancelar',
    categoria: 'Compras',
    pergunta: 'Posso cancelar um pedido?',
    resposta: 'Sim, enquanto a entrega não for confirmada. Abra o pedido em Meus pedidos e escolha Cancelar pedido.',
  },
  {
    id: 'denunciar',
    categoria: 'Anúncios',
    pergunta: 'Como denunciar um anúncio?',
    resposta: 'No anúncio, toque em Denunciar e escolha o motivo. Quem foi denunciado não fica sabendo quem denunciou.',
  },
  {
    id: 'senha',
    categoria: 'Conta',
    pergunta: 'Esqueci minha senha. O que faço?',
    resposta: (
      <>
        Use{' '}
        <Link to="/recuperar-senha" className={linkClasse}>
          Recuperar senha
        </Link>
        . Enviamos um link para o e-mail cadastrado.
      </>
    ),
  },
  {
    id: '2fa',
    categoria: 'Conta',
    pergunta: 'Como ativo a verificação em duas etapas?',
    resposta: (
      <>
        Em{' '}
        <Link to="/seguranca" className={linkClasse}>
          Segurança
        </Link>
        , ligue a verificação em duas etapas e siga os passos com um aplicativo autenticador.
      </>
    ),
  },
  {
    id: 'excluir',
    categoria: 'Conta',
    pergunta: 'Como excluo minha conta?',
    resposta:
      'Em Segurança, escolha Solicitar exclusão da conta. Durante 30 dias você pode desistir entrando de novo. Antes, conclua as negociações e use ou resgate suas moedas.',
  },
]

const categorias = ['Todas', 'Conta', 'Anúncios', 'Compras'] as const
const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Tela 048 · Central de Ajuda / FAQ (EDTS-299; STY057). */
export default function AjudaPage() {
  const [categoria, setCategoria] = useState<(typeof categorias)[number]>('Todas')
  const [busca, setBusca] = useState('')

  const filtradas = useMemo(() => {
    const termo = semAcento(busca.trim())
    return perguntas.filter(
      (p) => (categoria === 'Todas' || p.categoria === categoria) && (!termo || semAcento(p.pergunta).includes(termo)),
    )
  }, [busca, categoria])

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <MetaPagina titulo="Central de Ajuda" descricao="Respostas sobre conta, anúncios e compras no Steely." />
      <header className="flex flex-col gap-1">
        <h1 className="font-title text-24 font-bold">Central de Ajuda</h1>
        <p className="text-14 text-muted">Respostas rápidas sobre conta, anúncios e compras.</p>
      </header>

      <div className="relative">
        <label htmlFor="busca-ajuda" className="sr-only">
          Buscar dúvidas
        </label>
        <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-icon" />
        <input id="busca-ajuda" type="search" placeholder="Buscar dúvidas" value={busca} onChange={(e) => setBusca(e.target.value)} className={cn(classeEntrada, 'pl-11')} />
      </div>

      <ToggleGroup.Root
        type="single"
        value={categoria}
        onValueChange={(v) => v && setCategoria(v as (typeof categorias)[number])}
        aria-label="Filtrar por categoria"
        className="flex flex-wrap gap-2"
      >
        {categorias.map((c) => (
          <ToggleGroup.Item
            key={c}
            value={c}
            className={cn(
              'touch-target rounded-full border border-control bg-field px-4 text-13 font-semibold text-muted',
              'data-[state=on]:border-brand data-[state=on]:bg-brand data-[state=on]:text-on-brand',
            )}
          >
            {c}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>

      <p aria-live="polite" className="sr-only">
        {filtradas.length} {filtradas.length === 1 ? 'pergunta encontrada' : 'perguntas encontradas'}
      </p>

      {filtradas.length === 0 ? (
        <p className="text-14 text-muted">Nenhuma dúvida encontrada. Tente outras palavras ou outra categoria.</p>
      ) : (
        <Accordion.Root type="multiple" defaultValue={['moderacao']} className="flex flex-col gap-3">
          {filtradas.map((p) => (
            <Accordion.Item key={p.id} value={p.id} className="rounded-md border border-line bg-surface data-[state=open]:border-brand-line">
              <Accordion.Header>
                <Accordion.Trigger className="group flex min-h-14 w-full items-center justify-between gap-4 px-4 text-left text-14 font-semibold">
                  {p.pergunta}
                  <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-icon transition-transform group-data-[state=open]:rotate-180" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="px-4 pb-4 text-14 text-muted">{p.resposta}</Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      )}
    </div>
  )
}
