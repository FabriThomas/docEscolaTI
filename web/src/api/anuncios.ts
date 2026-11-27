import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cliente, resultado } from './cliente'
import { queryKeys } from './queryKeys'
import type { components } from './schema'

/**
 * Anúncios no FastAPI (EDTS-373): CRUD, pausar, boost, estatísticas, busca por raio, favoritos
 * e comparador. Tudo tipado pelo contrato gerado (openapi-fetch, ADR-18). Campos em snake_case,
 * como o backend devolve hoje.
 */

type Esquemas = components['schemas']
export type Anuncio = Esquemas['AnuncioResponse']
export type NovoAnuncio = Esquemas['AnuncioCreateRequest']
export type EdicaoAnuncio = Esquemas['AnuncioUpdateRequest']
export type EstatisticasAnuncio = Esquemas['AnuncioStatsResponse']
export type Comparacao = Esquemas['AnuncioComparadorResponse']

export type FiltrosBusca = {
  q?: string
  categoria?: string
  condicao?: string
  preco_min_centavos?: number
  preco_max_centavos?: number
  lat?: number
  lon?: number
  raio_km?: number
}

const POR_PAGINA = 12

/** Feed com paginação por cursor e anúncios impulsionados primeiro (tela 001). */
export function useFeed(categoria?: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.anuncios.feed(categoria ?? ''),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      resultado(
        cliente.GET('/api/v1/anuncios/', {
          params: { query: { cursor: pageParam, limit: POR_PAGINA, categoria: categoria || undefined } },
          signal,
        }),
      ),
    getNextPageParam: (pagina) => (pagina.has_more ? (pagina.next_cursor ?? undefined) : undefined),
  })
}

/** Busca com filtros e raio (telas 015 a 019). */
export function useBusca(filtros: FiltrosBusca, ativa = true) {
  return useQuery({
    queryKey: queryKeys.anuncios.busca(filtros),
    enabled: ativa,
    queryFn: ({ signal }) => resultado(cliente.GET('/api/v1/anuncios/busca', { params: { query: filtros }, signal })),
  })
}

export function useAnuncio(id: string) {
  return useQuery({
    queryKey: queryKeys.anuncios.detalhe(id),
    queryFn: ({ signal }) => resultado(cliente.GET('/api/v1/anuncios/{anuncio_id}', { params: { path: { anuncio_id: id } }, signal })),
  })
}

export function useEstatisticas(id: string, ativa: boolean) {
  return useQuery({
    queryKey: queryKeys.anuncios.estatisticas(id),
    enabled: ativa,
    queryFn: ({ signal }) =>
      resultado(cliente.GET('/api/v1/anuncios/{anuncio_id}/estatisticas', { params: { path: { anuncio_id: id } }, signal })),
  })
}

export function useMeusFavoritos(ativa = true) {
  return useQuery({
    queryKey: queryKeys.anuncios.favoritos,
    enabled: ativa,
    queryFn: ({ signal }) => resultado(cliente.GET('/api/v1/anuncios/favoritos/meus', { signal })),
  })
}

export function useComparacao(ids: string[]) {
  return useQuery({
    queryKey: queryKeys.anuncios.comparador(ids),
    enabled: ids.length >= 2,
    queryFn: ({ signal }) => resultado(cliente.GET('/api/v1/anuncios/comparador', { params: { query: { ids: ids.join(',') } }, signal })),
  })
}

function useInvalidarAnuncios() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.anuncios.todos })
}

/** Publicar (tela 006): cria o anúncio e depois envia as fotos (até 6, viram WebP sem EXIF no servidor). */
export function useCriarAnuncio() {
  const invalidar = useInvalidarAnuncios()
  return useMutation({
    mutationFn: async ({ dados, fotos }: { dados: NovoAnuncio; fotos: File[] }) => {
      const anuncio = await resultado(cliente.POST('/api/v1/anuncios/', { body: dados }))
      if (fotos.length) await enviarFotos(anuncio.id, fotos)
      return anuncio
    },
    onSuccess: invalidar,
  })
}

export function enviarFotos(id: string, fotos: File[]) {
  const corpo = new FormData()
  fotos.forEach((foto) => corpo.append('files', foto))
  return resultado(
    cliente.POST('/api/v1/anuncios/{anuncio_id}/fotos', {
      params: { path: { anuncio_id: id } },
      // multipart: o navegador define o Content-Type com o boundary
      body: corpo as unknown as Esquemas['Body_upload_fotos_anuncio_api_v1_anuncios__anuncio_id__fotos_post'],
      bodySerializer: (b) => b as unknown as FormData,
    }),
  )
}

export function useEditarAnuncio(id: string) {
  const invalidar = useInvalidarAnuncios()
  return useMutation({
    mutationFn: (dados: EdicaoAnuncio) =>
      resultado(cliente.PATCH('/api/v1/anuncios/{anuncio_id}', { params: { path: { anuncio_id: id } }, body: dados })),
    onSuccess: invalidar,
  })
}

/** Pausar e reativar (tela 009). */
export function useAlternarPausa(id: string) {
  const invalidar = useInvalidarAnuncios()
  return useMutation({
    mutationFn: (pausar: boolean) =>
      resultado(
        pausar
          ? cliente.POST('/api/v1/anuncios/{anuncio_id}/pausar', { params: { path: { anuncio_id: id } } })
          : cliente.POST('/api/v1/anuncios/{anuncio_id}/reativar', { params: { path: { anuncio_id: id } } }),
      ),
    onSuccess: invalidar,
  })
}

/** Excluir (tela 010): exclusão lógica no servidor. */
export function useExcluirAnuncio(id: string) {
  const invalidar = useInvalidarAnuncios()
  return useMutation({
    mutationFn: () => resultado(cliente.DELETE('/api/v1/anuncios/{anuncio_id}', { params: { path: { anuncio_id: id } } })),
    onSuccess: invalidar,
  })
}

/**
 * Impulsionar (tela 044). Gasta moedas: a mesma Idempotency-Key vale para todas as tentativas
 * do mesmo clique (ADR-14), então quem chama gera a chave uma vez e reaproveita no retry.
 */
export function useImpulsionar(id: string) {
  const invalidar = useInvalidarAnuncios()
  return useMutation({
    mutationFn: ({ duracao_horas, moedas_custo, chave }: { duracao_horas: number; moedas_custo: number; chave: string }) =>
      resultado(
        cliente.POST('/api/v1/anuncios/{anuncio_id}/boost', {
          params: { path: { anuncio_id: id } },
          headers: { 'Idempotency-Key': chave },
          body: { duracao_horas, moedas_custo },
        }),
      ),
    onSuccess: invalidar,
  })
}

/** Favoritar ou desfavoritar (tela 012). */
export function useAlternarFavorito() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => resultado(cliente.POST('/api/v1/anuncios/{anuncio_id}/favorito', { params: { path: { anuncio_id: id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.anuncios.todos }),
  })
}
