import { useEffect, useState } from 'react'

/** Segundos que faltam até `alvo` (timestamp em ms), atualizado a cada segundo. */
export function useContagem(alvo: number | null): number {
  const calcular = () => (alvo ? Math.max(0, Math.ceil((alvo - Date.now()) / 1000)) : 0)
  const [restante, setRestante] = useState(calcular)

  useEffect(() => {
    setRestante(calcular())
    if (!alvo) return
    const timer = setInterval(() => {
      const valor = calcular()
      setRestante(valor)
      if (valor <= 0) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alvo])

  return restante
}
