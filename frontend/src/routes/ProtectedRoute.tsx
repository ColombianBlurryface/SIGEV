/**
 * Protege las páginas privadas: si no hay sesión, redirige al login y recuerda
 * a qué página quería entrar el usuario para llevarlo allí después de iniciar sesión.
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function ProtectedRoute() {
  const { estaAutenticado } = useAuth()
  const location = useLocation()

  if (!estaAutenticado) {
    return <Navigate to="/login" replace state={{ desde: location.pathname }} />
  }

  return <Outlet />
}
