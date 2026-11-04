/**
 * Tipos del personal de servicio (HU-26 · RF-33): lo que devuelve y recibe /api/personal.
 */
export type RolPersonal = 'mesero'

export interface Personal {
  id: number
  nombre_completo: string
  contacto: string
  rol: RolPersonal
  activo: boolean
  creado_en: string
}

export interface DatosPersonal {
  nombre_completo: string
  contacto: string
  rol?: RolPersonal
}
