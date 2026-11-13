/**
 * Horario de un evento (HU-28): la hora de inicio y lo que dura dan la hora en que termina. Se usa para mostrar «18:00 – 22:00»
 * y, en el servidor, para saber si dos eventos se cruzan (si uno termina justo cuando empieza el otro, no).
 */
export const HORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/

/** Hora en que termina un evento («18:00» + 4 h → «22:00»), y si cae al día siguiente. null si la hora no es válida. */
export function calcularFin(horaInicio: string, duracionHoras: number): { hora: string; diaSiguiente: boolean } | null {
  if (!HORA_VALIDA.test(horaInicio) || !Number.isFinite(duracionHoras) || duracionHoras <= 0) return null
  const [h, m] = horaInicio.split(':').map(Number)
  const total = h * 60 + m + Math.round(duracionHoras * 60)
  const minutos = total % 1440
  const hora = `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`
  return { hora, diaSiguiente: total >= 1440 }
}

/** «18:00 – 22:00», «22:00 – 02:00 (día siguiente)» o null si falta la hora. */
export function describirHorario(horaInicio: string | null | undefined, duracionHoras: number): string | null {
  if (!horaInicio) return null
  const fin = calcularFin(horaInicio, duracionHoras)
  if (!fin) return null
  return `${horaInicio} – ${fin.hora}${fin.diaSiguiente ? ' (día siguiente)' : ''}`
}
