import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

/**
 * Em SPA o leitor de tela não percebe a troca de página. Ao mudar de rota, leva o foco
 * para o título principal (h1) da nova página.
 */
export function useFocoNaTroca() {
  const { pathname } = useLocation()
  const primeira = useRef(true)

  useEffect(() => {
    if (primeira.current) {
      primeira.current = false
      return
    }
    const id = requestAnimationFrame(() => {
      const titulo = document.querySelector<HTMLElement>('main h1')
      if (titulo) {
        titulo.setAttribute('tabindex', '-1')
        titulo.focus({ preventScroll: false })
      }
      window.scrollTo({ top: 0 })
    })
    return () => cancelAnimationFrame(id)
  }, [pathname])
}
