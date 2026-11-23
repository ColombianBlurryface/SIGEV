/**
 * Tipos para el Balance Logístico (Épica 6 · HU-31 a HU-35, RF-39 a RF-44).
 *
 * Cada recurso del evento (personal, alimento, bebida, mobiliario, servicio)
 * se consolida en el balance con su cantidad requerida, cantidad disponible,
 * estado (disponible, por_comprar, por_conseguir, pendiente) y fecha límite.
 */

export type CategoriaBalance = 'personal' | 'alimento' | 'bebida' | 'mobiliario' | 'servicio'

export type EstadoRecursoBalance = 'disponible' | 'por_comprar' | 'por_conseguir' | 'pendiente'

/**
 * Enumerador estricto para el DTO oficial de la API (HU-32 · RF-41).
 * Nota de negocio: NO debe existir el valor BOUGHT o COMPRADO.
 */
export type ResourceStatus = 'AVAILABLE' | 'TO_BUY' | 'TO_PROCURE' | 'PENDING'

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
  status?: ResourceStatus
  fecha_limite?: string | null
  notas?: string | null
  creado_en?: string
  actualizado_en?: string
}

export interface ResourceItemBalance {
  item_name: string
  required_quantity: number
  available_quantity: number
  deficit_quantity: number
  unit: string
  status: ResourceStatus
}

export interface ResourceCategoryBalance {
  category_name: 'STAFF' | 'FOOD' | 'DRINKS' | 'FURNITURE' | 'OTHER'
  category_label?: string
  items: ResourceItemBalance[]
}

export interface LogisticsBalanceResponse {
  event_id: string
  event_name: string
  guest_count: number
  categories: ResourceCategoryBalance[]
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
