/**
 * Llamadas a la API del inventario: elementos, cantidades, adquisiciones y movimientos.
 */
import type {
  CategoriaInventario,
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

  // HU-12: marca un elemento como propio (true) o alquilado (false)
  actualizarPropiedad(id: number, esPropio: boolean) {
    return apiRequest<ElementoInventario>(`/inventario/${id}/propiedad`, {
      method: 'PATCH',
      body: { es_propio: esPropio },
    })
  },

  // HU-09: cambia la categoría de un elemento (el backend la valida contra las cuatro permitidas)
  actualizarCategoria(id: number, categoria: CategoriaInventario) {
    return apiRequest<ElementoInventario>(`/inventario/${id}/categoria`, {
      method: 'PATCH',
      body: { categoria_inventario: categoria },
    })
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
