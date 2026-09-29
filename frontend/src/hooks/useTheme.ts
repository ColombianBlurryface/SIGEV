/**
 * Hook para leer o cambiar el tema: const { tema, alternarTema } = useTheme().
 */
import { useContext } from 'react'
import { ThemeContext } from '@/context/theme-context'

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme debe usarse dentro de <ThemeProvider>')
  return context
}
