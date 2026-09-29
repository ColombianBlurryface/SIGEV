/**
 * Las cuatro categorías de requerimientos de un evento (alimentos, bebidas, mobiliario y servicios)
 * con su nombre, ícono y colores, y los tipos de servicio adicional.
 */
import { Armchair, Music, Utensils, Wine, type LucideIcon } from 'lucide-react'
import type { ClasificacionProducto } from '@/types/evento'

export type Categoria = 'alimentos' | 'bebidas' | 'mobiliario' | 'servicios'

export const TIPO_MOBILIARIO = 'mobiliario'

export const TIPOS_SERVICIO = [
  { valor: 'dj', etiqueta: 'DJ' },
  { valor: 'musica_en_vivo', etiqueta: 'Música en vivo' },
  { valor: 'sonido', etiqueta: 'Sonido' },
  { valor: 'iluminacion', etiqueta: 'Iluminación' },
  { valor: 'entretenimiento', etiqueta: 'Entretenimiento' },
  { valor: 'otro', etiqueta: 'Otro' },
] as const

export function etiquetaServicio(tipo: string) {
  const conocido = TIPOS_SERVICIO.find((t) => t.valor === tipo)
  if (conocido) return conocido.etiqueta
  const limpio = tipo.replace(/_/g, ' ')
  return limpio.charAt(0).toUpperCase() + limpio.slice(1)
}

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
