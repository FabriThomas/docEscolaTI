/** Fábrica central de chaves de cache (ADR-18: evita chaves inconsistentes entre telas). */
export const queryKeys = {
  sessao: ['sessao'] as const,
  conta: {
    todas: ['conta'] as const,
    perfil: ['conta', 'perfil'] as const,
    seguranca: ['conta', 'seguranca'] as const,
  },
  servidor: {
    saude: ['servidor', 'saude'] as const,
  },
  anuncios: {
    todos: ['anuncios'] as const,
    feed: (categoria: string) => ['anuncios', 'feed', categoria] as const,
    busca: (filtros: object) => ['anuncios', 'busca', filtros] as const,
    detalhe: (id: string) => ['anuncios', 'detalhe', id] as const,
    estatisticas: (id: string) => ['anuncios', 'estatisticas', id] as const,
    favoritos: ['anuncios', 'favoritos'] as const,
    comparador: (ids: string[]) => ['anuncios', 'comparador', ...ids] as const,
  },
}
