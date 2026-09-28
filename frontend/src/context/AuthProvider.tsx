/**
 * Proveedor de la sesión: guarda quién inició sesión y ofrece iniciarSesion / cerrarSesion
 * a toda la aplicación.
 */
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { tokenExpirado } from '@/lib/jwt'
import { sesionStorage } from '@/lib/storage'
import { authService } from '@/services/authService'
import type { Credenciales, Sesion } from '@/types/auth'
import { AuthContext, type AuthContextValue } from './auth-context'

// Al abrir la app se recupera la sesión guardada, salvo que el token ya haya vencido
function sesionInicial(): Sesion | null {
  const sesion = sesionStorage.leer()
  if (!sesion || tokenExpirado(sesion.token)) {
    sesionStorage.borrar()
    return null
  }
  return sesion
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(sesionInicial)

  // Pide el token al backend y, si las credenciales son correctas, guarda la sesión
  const iniciarSesion = useCallback(async (credenciales: Credenciales) => {
    const nuevaSesion = await authService.login(credenciales)
    sesionStorage.guardar(nuevaSesion)
    setSesion(nuevaSesion)
  }, [])

  const cerrarSesion = useCallback(() => {
    sesionStorage.borrar()
    setSesion(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      usuario: sesion?.usuario ?? null,
      estaAutenticado: sesion !== null,
      iniciarSesion,
      cerrarSesion,
    }),
    [sesion, iniciarSesion, cerrarSesion],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
