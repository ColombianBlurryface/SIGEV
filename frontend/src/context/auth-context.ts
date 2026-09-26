import { createContext } from 'react'
import type { Credenciales, Usuario } from '@/types/auth'

export interface AuthContextValue {
  usuario: Usuario | null
  estaAutenticado: boolean
  iniciarSesion: (credenciales: Credenciales) => Promise<void>
  cerrarSesion: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
