/**
 * Guarda, lee y borra la sesión del usuario en el localStorage del navegador,
 * para que siga iniciada aunque se recargue la página.
 */
import type { Sesion } from '@/types/auth'

const SESION_KEY = 'sigev-sesion'

export const sesionStorage = {
  leer(): Sesion | null {
    try {
      const raw = localStorage.getItem(SESION_KEY)
      return raw ? (JSON.parse(raw) as Sesion) : null
    } catch {
      return null
    }
  },
  guardar(sesion: Sesion) {
    localStorage.setItem(SESION_KEY, JSON.stringify(sesion))
  },
  borrar() {
    localStorage.removeItem(SESION_KEY)
  },
}
