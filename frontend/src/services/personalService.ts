/**
 * Llamadas a la API del personal de servicio: registrar y listar (HU-26 · RF-33) y eliminar (HU-27 · RF-34) meseros.
 * No hay «editar»: los datos de un mesero no se modifican; si hubo un error, se elimina y se registra de nuevo.
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

  // Borrado lógico: el mesero deja de aparecer en el listado (responde 204, sin cuerpo)
  eliminar(id: number) {
    return apiRequest<null>(`/personal/${id}`, { method: 'DELETE' })
  },
}
