/**
 * Llamadas a la API del catálogo de productos: consultar, crear, editar y activar o desactivar.
 */
import type { DatosProducto, ProductoCatalogo } from '@/types/catalogo'
import type { ClasificacionProducto } from '@/types/evento'
import { apiRequest } from './api'

export const catalogoService = {
  // incluirInactivos solo lo usa la pantalla de administración; el registro de eventos pide los activos
  listar(clasificacion?: ClasificacionProducto, incluirInactivos = false) {
    const params = new URLSearchParams()
    if (clasificacion) params.set('clasificacion', clasificacion)
    if (incluirInactivos) params.set('incluir_inactivos', 'true')
    const query = params.size > 0 ? `?${params}` : ''
    return apiRequest<ProductoCatalogo[]>(`/catalogo${query}`)
  },

  crear(datos: DatosProducto) {
    return apiRequest<ProductoCatalogo>('/catalogo', { method: 'POST', body: datos })
  },

  actualizar(id: number, datos: DatosProducto) {
    return apiRequest<ProductoCatalogo>(`/catalogo/${id}`, { method: 'PUT', body: datos })
  },

  cambiarEstado(id: number, activo: boolean) {
    return apiRequest<ProductoCatalogo>(`/catalogo/${id}/estado`, { method: 'PATCH', body: { activo } })
  },
}
