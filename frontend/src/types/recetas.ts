/**
 * Tipos de las recetas de los platos (HU-46 · RF-54): lo que devuelve y recibe /api/catalogo/:id/receta.
 */
export type UnidadReceta = 'gramo' | 'kilo' | 'libra' | 'arroba'

export interface IngredienteReceta {
  ingrediente_id: number
  ingrediente: string
  cantidad_porcion: number
  unidad_porcion: UnidadReceta
  unidad_compra: UnidadReceta
  es_dato_prueba: boolean
}

export interface RecetaPlato {
  plato_id: number
  plato: string
  // true mientras la receta sea la de ejemplo; al guardar la receta real deja de serlo
  es_dato_prueba: boolean
  receta: IngredienteReceta[]
}

// Una fila del resumen: cuántos ingredientes tiene la receta de cada plato (0 = sin receta)
export interface ResumenReceta {
  plato_id: number
  plato: string
  activo: boolean
  ingredientes: number
  es_dato_prueba: boolean
}

// Un ingrediente del maestro: cómo se compra y en cuántos platos se usa
export interface IngredienteMaestro {
  id: number
  nombre: string
  unidad_compra: UnidadReceta
  platos: number
}

export interface LineaRecetaPayload {
  nombre_ingrediente: string
  unidad_compra: UnidadReceta
  cantidad_porcion: number
  unidad_porcion: UnidadReceta
}
