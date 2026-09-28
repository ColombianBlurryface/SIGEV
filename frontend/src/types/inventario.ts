/**
 * Tipos del inventario propio (HU-08) y de su historial de movimientos (HU-09).
 */
export const CATEGORIAS_INVENTARIO = ['Mobiliario', 'Bar/Bebidas', 'Bebidas de Coctelería'] as const

export type CategoriaInventario = (typeof CATEGORIAS_INVENTARIO)[number]

export interface ElementoInventario {
  id: number
  nombre: string
  categoria_inventario: CategoriaInventario
  cantidad_propia: number
  cantidad_danada: number
  es_propio: boolean
  unidad_medida: string
}

export interface NuevoElementoInventario {
  nombre: string
  categoria_inventario: CategoriaInventario
  cantidad_propia: number
}

export type TipoMovimiento = 'registro' | 'adquisicion' | 'ajuste'

export interface MovimientoInventario {
  id: number
  producto_id: number
  nombre: string
  categoria_inventario: CategoriaInventario
  tipo: TipoMovimiento
  cantidad: number
  cantidad_resultante: number
  notas: string | null
  creado_en: string
}

export interface RegistrarAdquisicionResponse {
  elemento: ElementoInventario
  movimiento: Omit<MovimientoInventario, 'nombre' | 'categoria_inventario'>
}
