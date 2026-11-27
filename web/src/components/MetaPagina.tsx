/**
 * Título e descrição por rota (ADR-20: SEO ≥ 90 sem SSR). O React 19 leva <title> e <meta>
 * para o <head> sozinho. Páginas da conta usam noindex.
 */
export function MetaPagina({ titulo, descricao, privada }: { titulo: string; descricao?: string; privada?: boolean }) {
  return (
    <>
      <title>{`${titulo} · Steely`}</title>
      {descricao && <meta name="description" content={descricao} />}
      {privada && <meta name="robots" content="noindex" />}
    </>
  )
}
