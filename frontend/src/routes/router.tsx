/**
 * Mapa de rutas (páginas) de la aplicación.
 * - /login solo se ve sin sesión.
 * - /eventos, /eventos/nuevo e /inventario requieren sesión y se muestran dentro del layout con menú lateral.
 */
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { EventosPage } from '@/pages/eventos/EventosPage'
import { NuevoEventoPage } from '@/pages/eventos/NuevoEventoPage'
import { InventarioPage } from '@/pages/inventario/InventarioPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ProtectedRoute } from './ProtectedRoute'
import { PublicOnlyRoute } from './PublicOnlyRoute'

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/eventos" replace /> },
  {
    element: <PublicOnlyRoute />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/eventos', element: <EventosPage /> },
          { path: '/eventos/nuevo', element: <NuevoEventoPage /> },
          { path: '/inventario', element: <InventarioPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
