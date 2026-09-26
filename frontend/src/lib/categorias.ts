import { Armchair, Music, Utensils, Wine, type LucideIcon } from 'lucide-react'
import type { ClasificacionProducto } from '@/types/evento'

export type Categoria = 'alimentos' | 'bebidas' | 'mobiliario' | 'servicios'

export const TIPO_MOBILIARIO = 'mobiliario'

interface ConfigCategoria {
  etiqueta: string
  icono: LucideIcon
  clases: string
}

export const CATEGORIAS: Record<Categoria, ConfigCategoria> = {
  alimentos: { etiqueta: 'Alimentos', icono: Utensils, clases: 'bg-alimentos-soft text-alimentos' },
  bebidas: { etiqueta: 'Bebidas', icono: Wine, clases: 'bg-bebidas-soft text-bebidas' },
  mobiliario: { etiqueta: 'Mobiliario', icono: Armchair, clases: 'bg-mobiliario-soft text-mobiliario' },
  servicios: { etiqueta: 'Servicios adicionales', icono: Music, clases: 'bg-servicios-soft text-servicios' },
}

export function categoriaDe(clasificacion: ClasificacionProducto): Categoria {
  if (clasificacion === 'alimento') return 'alimentos'
  if (clasificacion === 'mobiliario') return 'mobiliario'
  return 'bebidas'
}
