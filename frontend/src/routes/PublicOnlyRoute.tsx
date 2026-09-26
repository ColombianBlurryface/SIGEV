import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function PublicOnlyRoute() {
  const { estaAutenticado } = useAuth()
  return estaAutenticado ? <Navigate to="/eventos" replace /> : <Outlet />
}
