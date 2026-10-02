/**
 * Tipos del asistente de registro de eventos: lo que el usuario va agregando en el paso
 * "Requerimientos" (alimentos, bebidas, mobiliario y servicios) antes de guardar.
 */
import type { ProductoCatalogo } from './catalogo'

export interface AlimentoAgregado {
  producto: ProductoCatalogo
  porcion: number
  componentes: string
}

export interface BebidaAgregada {
  producto: ProductoCatalogo
  porcion: number
}

/**
 * Mobiliario del evento (HU-04). Desde la HU-12 se elige un elemento del inventario:
 * productoId y disponible guardan cuál es y cuántas unidades propias había al agregarlo.
 * Si el elemento no está en el inventario, productoId es null y todo va a alquiler.
 */
export interface MobiliarioAgregado {
  id: string
  productoId: number | null
  elemento: string
  referencia: string
  cantidad: number
  disponible: number | null
}

export interface ServicioAgregado {
  id: string
  tipo: string
  descripcion: string
  cantidad: number | null
  notas: string
}

export interface RequerimientosEvento {
  alimentos: AlimentoAgregado[]
  bebidas: BebidaAgregada[]
  mobiliario: MobiliarioAgregado[]
  servicios: ServicioAgregado[]
}

export const REQUERIMIENTOS_VACIOS: RequerimientosEvento = { alimentos: [], bebidas: [], mobiliario: [], servicios: [] }
