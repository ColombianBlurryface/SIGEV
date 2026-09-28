import type { ElementoInventario, NuevoElementoInventario } from '@/types/inventario'
import { apiRequest } from './api'

export const inventarioService = {
  listar() {
    return apiRequest<ElementoInventario[]>('/inventario')
  },

  registrar(elemento: NuevoElementoInventario) {
    return apiRequest<ElementoInventario>('/inventario', { method: 'POST', body: elemento })
  },

  actualizarCantidad(id: number, cantidad: number) {
    return apiRequest<ElementoInventario>(`/inventario/${id}/cantidad`, {
      method: 'PATCH',
      body: { cantidad_propia: cantidad },
    })
  },
}
