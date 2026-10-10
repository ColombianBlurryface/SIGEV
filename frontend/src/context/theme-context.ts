/**
 * Definición del contexto del tema (claro u oscuro), disponible con el hook useTheme().
 */
import { createContext } from 'react'
import type { Tema } from '@/types/theme'

export interface ThemeContextValue {
  tema: Tema
  alternarTema: () => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)
