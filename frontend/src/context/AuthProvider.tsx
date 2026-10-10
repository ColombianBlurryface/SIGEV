/**
 * Proveedor de la sesión: guarda quién inició sesión y ofrece iniciarSesion / cerrarSesion
 * a toda la aplicación.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { tokenExpirado } from '@/lib/jwt'
import { sesionStorage } from '@/lib/storage'
import { EVENTO_SESION_RECHAZADA } from '@/services/api'
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

  // Si el servidor rechaza el token (venció o se invalidó), la sesión se cierra sola y la aplicación
  // vuelve al login. apiRequest avisa con un evento porque vive fuera de React.
  useEffect(() => {
    const alRechazar = () => setSesion(null)
    window.addEventListener(EVENTO_SESION_RECHAZADA, alRechazar)
    return () => window.removeEventListener(EVENTO_SESION_RECHAZADA, alRechazar)
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
