import type { ReactNode } from 'react'
import { MetaPagina } from '@/components/MetaPagina'

type Secao = { titulo: string; texto: ReactNode }

/** Página de texto longo (Termos e Privacidade): leitura em coluna e índice no desktop. */
export function TextoLegal({ titulo, descricao, atualizadoEm, destaque, secoes }: { titulo: string; descricao: string; atualizadoEm: string; destaque?: ReactNode; secoes: Secao[] }) {
  return (
    <article className="mx-auto grid w-full max-w-5xl gap-10 lg:grid-cols-[16rem_1fr]">
      <MetaPagina titulo={titulo} descricao={descricao} />
      <nav aria-label="Nesta página" className="hidden lg:block">
        <ol className="sticky top-24 flex flex-col gap-1 border-l border-line">
          {secoes.map((s, i) => (
            <li key={s.titulo}>
              <a href={`#secao-${i + 1}`} className="-ml-px flex min-h-9 items-center border-l border-transparent pl-4 text-13 text-muted hover:border-brand hover:text-fg">
                {s.titulo}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <div className="flex max-w-prose flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="font-title text-24 font-bold">{titulo}</h1>
          <p className="text-13 text-muted">Atualizado em {atualizadoEm}</p>
        </header>
        {destaque}
        {secoes.map((s, i) => (
          <section key={s.titulo} id={`secao-${i + 1}`} className="flex scroll-mt-24 flex-col gap-2">
            <h2 className="font-title text-18 font-bold">{s.titulo}</h2>
            <div className="flex flex-col gap-2 text-15 text-muted">{s.texto}</div>
          </section>
        ))}
      </div>
    </article>
  )
}
