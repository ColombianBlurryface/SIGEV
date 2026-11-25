/**
 * Servicio de Balance Logístico (Épica 6 · HU-31 a HU-35, RF-39 a RF-44).
 */
import { apiRequest } from './api'
import type { BalanceLogisticoEvento, RespuestaFechaLimite } from '@/types/balance'

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

  /**
   * Fija o cambia la fecha límite para conseguir un recurso (HU-33 · RF-42). Con null se quita.
   * La fecha va como AAAA-MM-DD y no puede ser posterior a la del evento (si lo es, el servidor responde 400).
   */
  establecerFechaLimite(eventoId: number, recursoId: number, fecha: string | null) {
    return apiRequest<RespuestaFechaLimite>(`/eventos/${eventoId}/balance/recursos/${recursoId}/fecha-limite`, {
      method: 'PUT',
      body: { deadline_date: fecha },
    })
  },
}
