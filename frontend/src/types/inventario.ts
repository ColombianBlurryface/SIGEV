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
