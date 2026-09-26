import type { ProductoCatalogo } from '@/types/catalogo'
import type { ClasificacionProducto } from '@/types/evento'
import { apiRequest } from './api'

export const catalogoService = {
  listar(clasificacion?: ClasificacionProducto) {
    const query = clasificacion ? `?clasificacion=${encodeURIComponent(clasificacion)}` : ''
    return apiRequest<ProductoCatalogo[]>(`/catalogo${query}`)
  },
}
