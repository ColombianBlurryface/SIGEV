import type { CrearEventoResponse, EventoDetalle, EventoListado, NuevoEvento } from '@/types/evento'
import { apiRequest } from './api'

export const eventosService = {
  listar() {
    return apiRequest<EventoListado[]>('/eventos')
  },

  obtener(id: number) {
    return apiRequest<EventoDetalle>(`/eventos/${id}`)
  },

  crear(evento: NuevoEvento) {
    return apiRequest<CrearEventoResponse>('/eventos', {
      method: 'POST',
      body: { productos: [], servicios_adicionales: [], ...evento },
    })
  },
}
