/**
 * Tipos de los eventos: lo que se envía al registrarlos y lo que devuelve la API al consultarlos.
 * Los valores numéricos de PostgreSQL (NUMERIC) llegan como texto, por eso varios campos son string.
 */
export const TIPOS_EVENTO = ['Boda', 'Corporativo', 'Quinceañero', 'Gala', 'Cumpleaños', 'Otro'] as const

export type TipoEvento = (typeof TIPOS_EVENTO)[number]

export type EstadoEvento = 'planificacion' | 'confirmado' | 'realizado' | 'cancelado'

export interface Evento {
  id: number
  nombre_evento: string
  fecha_evento: string
  tipo_evento: string
  duracion_horas: string
  asistentes: number
  estado: EstadoEvento
  observaciones_generales: string | null
  creado_en: string
}

export interface ProductoEventoPayload {
  producto_id: number
  porcion_por_persona: number
  componentes_menu?: string
}

export interface RequerimientoAdicionalPayload {
  tipo: string
  descripcion: string
  cantidad?: number
  notas?: string
  // Solo para mobiliario: elemento del inventario con el que se relaciona (HU-12)
  producto_id?: number
}

export interface NuevoEvento {
  nombre_evento: string
  fecha_evento: string
  tipo_evento: string
  duracion_horas: number
  asistentes: number
  observaciones_generales?: string
  productos?: ProductoEventoPayload[]
  servicios_adicionales?: RequerimientoAdicionalPayload[]
}

export interface CrearEventoResponse {
  mensaje: string
  evento: Evento
}

export interface EventoListado extends Evento {
  es_modalidad_buffet: boolean
  // Más de 200 asistentes: se avisa que probablemente haya que alquilar mobiliario (RN-03)
  aviso_alquiler: boolean
}

export type ClasificacionProducto = 'alimento' | 'bebida_general' | 'bar_cocteleria' | 'mobiliario'

export interface ProductoCalculado {
  id: number
  nombre: string
  clasificacion: ClasificacionProducto
  porcion_por_persona: string
  cantidad_neta: string
  cantidad_con_margen: string
  unidad_entrega: string
  precio_unitario: string
  costo_estimado: string
  componentes_menu: string | null
}

export interface ServicioAdicional {
  id: number
  tipo: string
  descripcion: string
  cantidad: number | null
  notas: string | null
  creado_en: string
  // HU-12: solo en el mobiliario. Se comparan con el stock actual del inventario.
  producto_id: number | null
  disponible_inventario: number | null
  inventario_es_propio: boolean | null
  unidades_propias: number | null
  unidades_alquilar: number | null
}

// RN-03 (HU-12): estado de alquiler que calcula el backend con el umbral de asistentes (P-05)
export interface EstadoAlquiler {
  requiere_alquiler: boolean
  umbral_superado: boolean
  umbral: number
  // El mobiliario pedido no alcanza con el stock propio (aunque no se supere el umbral)
  inventario_insuficiente: boolean
  unidades_alquilar: number
  motivo: string
}

export interface EventoDetalle extends EventoListado {
  estado_alquiler: EstadoAlquiler
  productos_calculados: ProductoCalculado[]
  servicios_adicionales: ServicioAdicional[]
}
