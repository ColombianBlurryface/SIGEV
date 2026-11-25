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
  /** Cantidad faltante (HU-32 / HU-35): requerido - disponible cuando hay déficit */
  deficit_quantity?: number
  unidad_medida: string
  estado: EstadoRecursoBalance
  status?: ResourceStatus
  /** Identificador estable del recurso en el contrato oficial (el mismo `id`, como texto) */
  item_id?: string
  /** El estado lo fijó una persona a mano (se puede deshacer) */
  estado_manual?: boolean
  /** Marcado a mano como disponible: se muestra cubierto, sin déficit (HU-34 · RF-43) */
  is_manually_fulfilled?: boolean
  /** Fecha límite para conseguir el recurso (HU-33 · RF-42), en formato AAAA-MM-DD */
  fecha_limite?: string | null
  deadline_date?: string | null
  notas?: string | null
  creado_en?: string
  actualizado_en?: string
}

export interface ResourceItemBalance {
  item_id: string
  item_name: string
  required_quantity: number
  available_quantity: number
  deficit_quantity: number
  unit: string
  status: ResourceStatus
  deadline_date: string | null
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
  /** Fecha del evento (AAAA-MM-DD): la fecha límite de un recurso no puede pasar de ahí */
  fecha_evento?: string | null
  categories?: ResourceCategoryBalance[]
  resumen: ResumenBalanceLogistico
  recursos: RecursoBalance[]
  recursos_por_categoria: Record<CategoriaBalance, RecursoBalance[]>
  faltantes_anticipados: RecursoBalance[]
}

/** Respuesta al fijar o quitar la fecha límite de un recurso (HU-33 · RF-42) */
export interface RespuestaFechaLimite {
  event_id: string
  item_id: string
  deadline_date: string | null
  message: string
  balance: BalanceLogisticoEvento
}
