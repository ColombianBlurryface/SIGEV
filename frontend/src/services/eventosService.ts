/**
 * Llamadas a la API de eventos: listar, ver el detalle y registrar.
 */
import type { AsignacionMeseros, ComprasCocteles, ComprasIngredientes, CrearEventoResponse, EventStaffDeviationResponse, MeserosDisponibles, EventoDetalle, EventoListado, NuevoEvento } from '@/types/evento'
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

  // HU-45: botellas de licor para coctelería a comprar de unos cócteles y unos asistentes, antes de guardar el evento
  calcularComprasCocteles(asistentes: number, productos: { producto_id?: number; coctel_id?: number; porcion_por_persona?: number }[]) {
    return apiRequest<ComprasCocteles>('/eventos/calcular-compras-cocteles', { method: 'POST', body: { asistentes, productos } })
  },

  // HU-28: los meseros registrados frente a un evento (cuáles ya están asignados y cuáles están ocupados en otro evento)
  meserosDisponibles(eventoId: number) {
    return apiRequest<MeserosDisponibles>(`/eventos/${eventoId}/meseros/disponibles`)
  },

  // HU-28: sincroniza los meseros del evento con la lista enviada (quita a los que no vienen, agrega a los nuevos)
  asignarMeseros(eventoId: number, personalIds: number[]) {
    return apiRequest<AsignacionMeseros>(`/eventos/${eventoId}/meseros`, { method: 'PUT', body: { personal_ids: personalIds } })
  },

  // HU-25 (RF-32): alerta y balance de desviaciones de personal frente al estándar calculado
  desviacionesPersonal(eventoId: number) {
    return apiRequest<EventStaffDeviationResponse>(`/eventos/${eventoId}/desviaciones-personal`)
  },

  crear(evento: NuevoEvento) {
    return apiRequest<CrearEventoResponse>('/eventos', {
      method: 'POST',
      body: { productos: [], servicios_adicionales: [], ...evento },
    })
  },
}
