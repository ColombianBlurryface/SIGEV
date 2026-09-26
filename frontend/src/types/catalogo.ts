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
}
