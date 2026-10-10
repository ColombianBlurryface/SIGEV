/**
 * Tipos de los productos del catálogo que devuelve GET /api/catalogo.
 */
import type { ClasificacionProducto } from './evento'

export type TipoCalculo = 'porcion_persona' | 'unidad_persona' | 'botella_compartida' | 'cantidad_fija'

export interface ProductoCatalogo {
  id: number
  nombre: string
  clasificacion: ClasificacionProducto
  tipo_calculo: TipoCalculo
  porcion_por_persona: string
  unidad_medida: string
  volumen_botella_ml: string
  tamano_porcion_ml: string
  precio_unitario: string
  // false = desactivado: no se ofrece en los eventos nuevos (llega siempre desde el backend)
  activo: boolean
}

// Grupos en los que se puede crear un producto del catálogo (el mobiliario vive en el inventario)
export type GrupoCatalogo = 'alimento' | 'bebida_general' | 'bar_cocteleria'

// Datos que se envían al crear o editar un producto
export interface DatosProducto {
  nombre: string
  clasificacion: GrupoCatalogo
  tipo_calculo: 'porcion_persona' | 'unidad_persona' | 'botella_compartida'
  porcion_por_persona?: number
  volumen_botella_ml?: number
  tamano_porcion_ml?: number
  precio_unitario: number
}
