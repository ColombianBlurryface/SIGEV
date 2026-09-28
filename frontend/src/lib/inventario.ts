/**
 * Ícono y colores de cada categoría del inventario.
 */
import { Armchair, Martini, Wine, type LucideIcon } from 'lucide-react'
import type { CategoriaInventario } from '@/types/inventario'

interface ConfigCategoriaInventario {
  icono: LucideIcon
  clases: string
}

export const ESTILO_CATEGORIA_INVENTARIO: Record<CategoriaInventario, ConfigCategoriaInventario> = {
  Mobiliario: { icono: Armchair, clases: 'bg-mobiliario-soft text-mobiliario' },
  'Bar/Bebidas': { icono: Wine, clases: 'bg-bebidas-soft text-bebidas' },
  'Bebidas de Coctelería': { icono: Martini, clases: 'bg-servicios-soft text-servicios' },
}
