import type { CrearEventoResponse, NuevoEvento } from '@/types/evento'
import { apiRequest } from './api'

export const eventosService = {
  crear(evento: NuevoEvento) {
    return apiRequest<CrearEventoResponse>('/eventos', {
      method: 'POST',
      body: { ...evento, productos: [], servicios_adicionales: [] },
    })
  },
}
