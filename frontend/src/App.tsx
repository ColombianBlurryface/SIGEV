/**
 * Componente raíz. Envuelve la app con los proveedores globales:
 * - ThemeProvider: modo claro / oscuro.
 * - AuthProvider: sesión del usuario (token y datos).
 * - RouterProvider: las rutas (páginas) de la aplicación.
 */
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthProvider'
import { ThemeProvider } from '@/context/ThemeProvider'
import { router } from '@/routes/router'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  )
}
