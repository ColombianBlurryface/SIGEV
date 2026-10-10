/**
 * Nombre, ícono y colores de cada categoría del inventario.
 *
 * El valor que se guarda y viaja por la API (por ejemplo «Bar/Bebidas») es la clave estable de la
 * categoría. El nombre que ve la encargada de logística es otro y vive solo aquí (QA-03): si
 * vuelve a cambiar, se ajusta en este archivo sin tocar la base de datos ni el backend.
 */
import { Armchair, Martini, UtensilsCrossed, Wine, type LucideIcon } from 'lucide-react'
import type { CategoriaInventario } from '@/types/inventario'

interface ConfigCategoriaInventario {
  icono: LucideIcon
  clases: string
}

// Nombre que se muestra en pantalla (formularios, filtros y etiquetas de la tabla)
export const ETIQUETA_CATEGORIA_INVENTARIO: Record<CategoriaInventario, string> = {
  Mobiliario: 'Mobiliario',
  'Bar/Bebidas': 'Bebidas Generales',
  'Bebidas de Coctelería': 'Licores para Cócteles',
  Vajilla: 'Vajilla',
}

export const etiquetaCategoria = (categoria: CategoriaInventario) => ETIQUETA_CATEGORIA_INVENTARIO[categoria]

export const ESTILO_CATEGORIA_INVENTARIO: Record<CategoriaInventario, ConfigCategoriaInventario> = {
  Mobiliario: { icono: Armchair, clases: 'bg-mobiliario-soft text-mobiliario' },
  'Bar/Bebidas': { icono: Wine, clases: 'bg-bebidas-soft text-bebidas' },
  'Bebidas de Coctelería': { icono: Martini, clases: 'bg-servicios-soft text-servicios' },
  Vajilla: { icono: UtensilsCrossed, clases: 'bg-alimentos-soft text-alimentos' },
}
