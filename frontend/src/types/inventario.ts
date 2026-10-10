/**
 * Tipos del inventario propio (HU-08) y de su historial de movimientos (HU-09).
 */
export const CATEGORIAS_INVENTARIO = ['Mobiliario', 'Bar/Bebidas', 'Bebidas de Coctelería', 'Vajilla'] as const

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
  // HU-12: true = propio (valor por defecto), false = alquilado a un proveedor
  es_propio?: boolean
}

export type TipoMovimiento = 'registro' | 'adquisicion' | 'ajuste' | 'baja'

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

// La baja por daño responde igual que una adquisición: el elemento actualizado y el movimiento creado
export type RegistrarBajaResponse = RegistrarAdquisicionResponse
