/**
 * Proveedor del tema visual. Aplica la clase "dark" en <html> cuando el modo oscuro está
 * activo (los colores de cada tema están en index.css) y recuerda la preferencia del usuario.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Tema } from '@/types/theme'
import { ThemeContext } from './theme-context'

const TEMA_KEY = 'sigev-tema'

function temaInicial(): Tema {
  try {
    return localStorage.getItem(TEMA_KEY) === 'oscuro' ? 'oscuro' : 'claro'
  } catch {
    return 'claro'
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(temaInicial)

  // Cada vez que cambia el tema se aplica la clase "dark" y se guarda la preferencia
  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'oscuro')
    try {
      localStorage.setItem(TEMA_KEY, tema)
    } catch {
      /* el tema solo dura esta sesión si el navegador bloquea el almacenamiento */
    }
  }, [tema])

  const alternarTema = useCallback(() => {
    setTema((actual) => (actual === 'oscuro' ? 'claro' : 'oscuro'))
  }, [])

  const value = useMemo(() => ({ tema, alternarTema }), [tema, alternarTema])

  return <ThemeContext value={value}>{children}</ThemeContext>
}
