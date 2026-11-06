/**
 * Tipos para el Balance Logístico (Épica 6 · HU-31 a HU-35, RF-39 a RF-44).
 *
 * Cada recurso del evento (personal, alimento, bebida, mobiliario, servicio)
 * se consolida en el balance con su cantidad requerida, cantidad disponible,
 * estado (disponible, por_comprar, por_conseguir, pendiente) y fecha límite.
 */

export type CategoriaBalance = 'personal' | 'alimento' | 'bebida' | 'mobiliario' | 'servicio'

export type EstadoRecursoBalance = 'disponible' | 'por_comprar' | 'por_conseguir' | 'pendiente'

export type OrigenRecursoTipo =
  | 'personal'
  | 'producto_catalogo'
  | 'ingrediente'
  | 'coctel'
  | 'servicio_adicional'

export interface RecursoBalance {
  id: number
  evento_id: number
  categoria: CategoriaBalance
  recurso_nombre: string
  origen_tipo?: OrigenRecursoTipo | null
  origen_id?: number | null
  cantidad_requerida: number
  cantidad_disponible: number
  unidad_medida: string
  estado: EstadoRecursoBalance
  fecha_limite?: string | null
  notas?: string | null
  creado_en?: string
  actualizado_en?: string
}

export interface ResumenBalanceLogistico {
  total_recursos: number
  disponibles: number
  por_comprar: number
  por_conseguir: number
  pendientes: number
  porcentaje_completitud: number
}

export interface BalanceLogisticoEvento {
  evento_id: number
  resumen: ResumenBalanceLogistico
  recursos: RecursoBalance[]
  recursos_por_categoria: Record<CategoriaBalance, RecursoBalance[]>
  faltantes_anticipados: RecursoBalance[]
}
