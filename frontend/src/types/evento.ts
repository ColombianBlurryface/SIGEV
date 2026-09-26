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

export interface NuevoEvento {
  nombre_evento: string
  fecha_evento: string
  tipo_evento: string
  duracion_horas: number
  asistentes: number
  observaciones_generales?: string
}

export interface CrearEventoResponse {
  mensaje: string
  evento: Evento
}

export interface EventoListado extends Evento {
  es_modalidad_buffet: boolean
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
}

export interface ServicioAdicional {
  id: number
  tipo: string
  descripcion: string
  cantidad: number | null
  notas: string | null
  creado_en: string
}

export interface EventoDetalle extends EventoListado {
  productos_calculados: ProductoCalculado[]
  servicios_adicionales: ServicioAdicional[]
}
