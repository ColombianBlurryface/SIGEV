/**
 * Servicio de Balance Logístico (Épica 6 · HU-31 a HU-35, RF-39 a RF-44).
 */
import { apiRequest } from './api'
import type { BalanceLogisticoEvento, RespuestaFechaLimite } from '@/types/balance'

function conParametros(ruta: string, params: Record<string, boolean | undefined>) {
  const qs = new URLSearchParams()
  for (const [clave, valor] of Object.entries(params)) {
    if (valor) qs.set(clave, 'true')
  }
  const query = qs.toString()
  return query ? `${ruta}?${query}` : ruta
}

export const balanceService = {
  /**
   * Consulta el balance logístico de un evento (HU-31 · RF-39, RF-40; HU-35 · RF-44).
   * Con `onlyMissing: true` envía `?only_missing=true` para obtener únicamente los recursos en déficit.
   */
  obtener(eventoId: number, syncOrOpciones: boolean | { sync?: boolean; onlyMissing?: boolean } = false) {
    const { sync = false, onlyMissing = false } =
      typeof syncOrOpciones === 'boolean' ? { sync: syncOrOpciones } : syncOrOpciones
    const ruta = conParametros(`/eventos/${eventoId}/balance`, { sync, only_missing: onlyMissing })
    return apiRequest<BalanceLogisticoEvento>(ruta)
  },

  /**
   * Fuerza la regeneración / sincronización del balance logístico del evento.
   */
  sincronizar(eventoId: number, onlyMissing = false) {
    const ruta = conParametros(`/eventos/${eventoId}/balance/sincronizar`, { only_missing: onlyMissing })
    return apiRequest<BalanceLogisticoEvento>(ruta, {
      method: 'POST',
    })
  },

  /**
   * Modifica manualmente el estado de un recurso en el balance logístico.
   */
  cambiarEstado(eventoId: number, recursoId: number, estado: string, onlyMissing = false) {
    const ruta = conParametros(`/eventos/${eventoId}/balance/recursos/${recursoId}`, { only_missing: onlyMissing })
    return apiRequest<{ mensaje: string; balance: BalanceLogisticoEvento }>(ruta, {
      method: 'PATCH',
      body: { estado },
    })
  },

  /**
   * Fija o cambia la fecha límite para conseguir un recurso (HU-33 · RF-42). Con null se quita.
   * La fecha va como AAAA-MM-DD y no puede ser posterior a la del evento (si lo es, el servidor responde 400).
   */
  establecerFechaLimite(eventoId: number, recursoId: number, fecha: string | null, onlyMissing = false) {
    const ruta = conParametros(`/eventos/${eventoId}/balance/recursos/${recursoId}/fecha-limite`, {
      only_missing: onlyMissing,
    })
    return apiRequest<RespuestaFechaLimite>(ruta, {
      method: 'PUT',
      body: { deadline_date: fecha },
    })
  },
}
