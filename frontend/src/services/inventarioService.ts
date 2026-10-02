/**
 * Llamadas a la API del inventario: elementos, cantidades, adquisiciones y movimientos.
 */
import type {
  ElementoInventario,
  MovimientoInventario,
  NuevoElementoInventario,
  RegistrarAdquisicionResponse,
} from '@/types/inventario'
import { apiRequest } from './api'

export const inventarioService = {
  listar() {
    return apiRequest<ElementoInventario[]>('/inventario')
  },

  registrar(elemento: NuevoElementoInventario) {
    return apiRequest<ElementoInventario>('/inventario', { method: 'POST', body: elemento })
  },

  actualizarCantidad(id: number, cantidad: number, motivo?: string) {
    return apiRequest<ElementoInventario>(`/inventario/${id}/cantidad`, {
      method: 'PATCH',
      body: { cantidad_propia: cantidad, motivo },
    })
  },

  registrarAdquisicion(id: number, cantidad: number, notas?: string) {
    return apiRequest<RegistrarAdquisicionResponse>(`/inventario/${id}/adquisiciones`, {
      method: 'POST',
      body: { cantidad, notas },
    })
  },

  listarMovimientos({ elementoId, limite }: { elementoId?: number; limite: number }) {
    const params = new URLSearchParams({ limite: String(limite) })
    if (elementoId) params.set('elemento_id', String(elementoId))
    return apiRequest<MovimientoInventario[]>(`/inventario/movimientos?${params}`)
  },
}
