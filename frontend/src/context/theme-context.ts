import { createContext } from 'react'
import type { Tema } from '@/types/theme'

export interface ThemeContextValue {
  tema: Tema
  alternarTema: () => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)
