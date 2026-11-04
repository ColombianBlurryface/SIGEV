/**
 * Llamadas a la API del personal de servicio (HU-26 · RF-33): registrar y listar meseros.
 */
import type { DatosPersonal, Personal, RolPersonal } from '@/types/personal'
import { apiRequest } from './api'

export const personalService = {
  // Solo devuelve el personal activo
  listar(rol?: RolPersonal) {
    return apiRequest<Personal[]>(`/personal${rol ? `?rol=${rol}` : ''}`)
  },

  crear(datos: DatosPersonal) {
    return apiRequest<Personal>('/personal', { method: 'POST', body: datos })
  },
}
