/**
 * Tipos del asistente de registro de eventos: lo que el usuario va agregando en el paso
 * "Requerimientos" (alimentos, bebidas, mobiliario y servicios) antes de guardar.
 */
import type { ProductoCatalogo } from './catalogo'

export interface AlimentoAgregado {
  producto: ProductoCatalogo
  porcion: number
  componentes: string
}

export interface BebidaAgregada {
  producto: ProductoCatalogo
  porcion: number
}

export const TIPOS_MOBILIARIO = [
  'Sillas',
  'Mesas redondas',
  'Mesas rectangulares',
  'Mesas de coctel',
  'Manteles',
  'Tarima',
  'Carpa',
  'Otro',
] as const

export interface MobiliarioAgregado {
  id: string
  elemento: string
  referencia: string
  cantidad: number
}

export interface ServicioAgregado {
  id: string
  tipo: string
  descripcion: string
  cantidad: number | null
  notas: string
}

export interface RequerimientosEvento {
  alimentos: AlimentoAgregado[]
  bebidas: BebidaAgregada[]
  mobiliario: MobiliarioAgregado[]
  servicios: ServicioAgregado[]
}

export const REQUERIMIENTOS_VACIOS: RequerimientosEvento = { alimentos: [], bebidas: [], mobiliario: [], servicios: [] }
