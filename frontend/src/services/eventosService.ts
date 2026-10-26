/**
 * Llamadas a la API de eventos: listar, ver el detalle y registrar.
 */
import type { ComprasIngredientes, CrearEventoResponse, EventoDetalle, EventoListado, NuevoEvento } from '@/types/evento'
import { apiRequest } from './api'

export const eventosService = {
  listar() {
    return apiRequest<EventoListado[]>('/eventos')
  },

  obtener(id: number) {
    return apiRequest<EventoDetalle>(`/eventos/${id}`)
  },

  // HU-47: ingredientes a comprar de unos platos y unos asistentes, antes de guardar el evento
  calcularCompras(asistentes: number, productos: number[]) {
    return apiRequest<ComprasIngredientes>('/eventos/calcular-compras', { method: 'POST', body: { asistentes, productos } })
  },

  crear(evento: NuevoEvento) {
    return apiRequest<CrearEventoResponse>('/eventos', {
      method: 'POST',
      body: { productos: [], servicios_adicionales: [], ...evento },
    })
  },
}
