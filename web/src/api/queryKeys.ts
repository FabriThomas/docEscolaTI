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
}
