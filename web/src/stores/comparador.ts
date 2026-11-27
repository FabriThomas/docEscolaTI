import { create } from 'zustand'

/** Anúncios escolhidos para comparar (tela 013): de 2 a 4, como o backend aceita. Estado de interface (ADR-18). */
export const MAX_COMPARAR = 4

type EstadoComparador = {
  ids: string[]
  alternar: (id: string) => 'adicionado' | 'removido' | 'cheio'
  limpar: () => void
}

export const useComparador = create<EstadoComparador>((set, get) => ({
  ids: [],
  alternar: (id) => {
    const { ids } = get()
    if (ids.includes(id)) {
      set({ ids: ids.filter((i) => i !== id) })
      return 'removido'
    }
    if (ids.length >= MAX_COMPARAR) return 'cheio'
    set({ ids: [...ids, id] })
    return 'adicionado'
  },
  limpar: () => set({ ids: [] }),
}))
