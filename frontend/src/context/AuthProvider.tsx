import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { tokenExpirado } from '@/lib/jwt'
import { sesionStorage } from '@/lib/storage'
import { authService } from '@/services/authService'
import type { Credenciales, Sesion } from '@/types/auth'
import { AuthContext, type AuthContextValue } from './auth-context'

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
