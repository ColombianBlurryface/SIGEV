/**
 * Servicio de Balance Logístico (Épica 6 · HU-31 a HU-35, RF-39 a RF-44).
 */
import { apiRequest } from './api'
import type { BalanceLogisticoEvento } from '@/types/balance'

export const balanceService = {
  /**
   * Consulta el balance logístico de un evento (HU-31 · RF-39, RF-40).
   * Si se pasa sync=true, regenera el balance con los requerimientos actuales.
   */
  obtener(eventoId: number, sync = false) {
    return apiRequest<BalanceLogisticoEvento>(`/eventos/${eventoId}/balance${sync ? '?sync=true' : ''}`)
  },

  /**
   * Fuerza la regeneración / sincronización del balance logístico del evento.
   */
  sincronizar(eventoId: number) {
    return apiRequest<BalanceLogisticoEvento>(`/eventos/${eventoId}/balance/sincronizar`, {
      method: 'POST',
    })
  },

  /**
   * Modifica manualmente el estado de un recurso en el balance logístico.
   */
  cambiarEstado(eventoId: number, recursoId: number, estado: string) {
    return apiRequest<{ mensaje: string; balance: BalanceLogisticoEvento }>(
      `/eventos/${eventoId}/balance/recursos/${recursoId}`,
      {
        method: 'PATCH',
        body: { estado },
      }
    )
  },
}
