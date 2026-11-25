import { Navigate, Outlet, useLocation } from 'react-router'
import { useSessao } from '@/api/auth'
import { Carregando } from '@/components/ui/Spinner'

/** Páginas da conta exigem login; sem sessão, vai para /entrar e volta depois. */
export function RotaProtegida() {
  const { data: usuario, isPending } = useSessao()
  const location = useLocation()

  if (isPending) return <Carregando texto="Verificando sua sessão…" />
  if (!usuario) return <Navigate to="/entrar" replace state={{ de: location.pathname }} />
  return <Outlet />
}
