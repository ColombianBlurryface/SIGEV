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
