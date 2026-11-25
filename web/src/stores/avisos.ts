import { create } from 'zustand'

/** Estado de interface (ADR-18: Zustand só para UI). Avisos curtos após ações. */
export type Aviso = { id: number; texto: string; tom: 'sucesso' | 'erro' }

type EstadoAvisos = {
  avisos: Aviso[]
  mostrar: (texto: string, tom?: Aviso['tom']) => void
  fechar: (id: number) => void
}

let proximoId = 1

export const useAvisos = create<EstadoAvisos>((set, get) => ({
  avisos: [],
  mostrar: (texto, tom = 'sucesso') => {
    const id = proximoId++
    set({ avisos: [...get().avisos, { id, texto, tom }] })
    setTimeout(() => get().fechar(id), 6000)
  },
  fechar: (id) => set({ avisos: get().avisos.filter((a) => a.id !== id) }),
}))

export const avisar = (texto: string, tom?: Aviso['tom']) => useAvisos.getState().mostrar(texto, tom)
