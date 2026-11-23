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

// ---------------------------------------------------------------------------------------------------------------------
// Hora escrita en formato de 12 horas (HU-52 · RF-59): «7:30» + «p. m.». La hora se sigue guardando y enviando en formato de
// 24 horas («19:30»), igual que antes: la API y la base de datos no cambian, solo la forma de escribirla.
// ---------------------------------------------------------------------------------------------------------------------

/** a. m. o p. m. ('' = todavía sin elegir) */
export type PeriodoHora = 'am' | 'pm' | ''

export const ETIQUETA_PERIODO: Record<'am' | 'pm', string> = { am: 'a. m.', pm: 'p. m.' }

/**
 * Valida lo que se escribió en el campo de la hora de inicio. Devuelve la hora en formato de 24 horas si todo está bien,
 * o el mensaje para mostrar junto al campo. 12:00 p. m. es mediodía (12:00) y 12:00 a. m. es medianoche (00:00).
 */
export function validarHora12(texto: string, periodo: PeriodoHora): { hora24: string | null; error: string | null } {
  const t = texto.trim()
  if (!t) return { hora24: null, error: 'Indica la hora de inicio (por ejemplo, 7:30).' }
  const partes = /^(\d{1,2}):(\d{2})$/.exec(t)
  if (!partes) return { hora24: null, error: 'La hora no es válida: escríbela con horas y minutos, por ejemplo 7:30.' }
  const horas = Number(partes[1])
  const minutos = Number(partes[2])
  if (horas < 1 || horas > 12) {
    return { hora24: null, error: 'La hora no es válida: en formato de 12 horas van de 1 a 12 (por ejemplo 7:30, no 13:00).' }
  }
  if (minutos > 59) return { hora24: null, error: 'La hora no es válida: los minutos van de 00 a 59 (por ejemplo 7:30, no 7:75).' }
  if (periodo !== 'am' && periodo !== 'pm') return { hora24: null, error: 'Elige a. m. o p. m.' }
  const h24 = (horas % 12) + (periodo === 'pm' ? 12 : 0)
  return { hora24: `${String(h24).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`, error: null }
}

/** Lo escrito (hora de 12 horas + a. m./p. m.) → «HH:MM» de 24 horas, o '' si todavía no es una hora válida. */
export function a24Horas(texto: string, periodo: PeriodoHora): string {
  return validarHora12(texto, periodo).hora24 ?? ''
}

/** «19:30» (o «19:30:00») → { texto: '7:30', periodo: 'pm' } para mostrarla en el campo. Vacío si no hay una hora válida. */
export function de24Horas(hora24: string | null | undefined): { texto: string; periodo: PeriodoHora } {
  const partes = /^([01]\d|2[0-3]):([0-5]\d)/.exec(hora24 ?? '')
  if (!partes) return { texto: '', periodo: '' }
  const h24 = Number(partes[1])
  return { texto: `${h24 % 12 || 12}:${partes[2]}`, periodo: h24 >= 12 ? 'pm' : 'am' }
}

/** Si se pega una hora completa («7:30 p. m.», «7:30pm»), la separa en hora y a. m./p. m. Si no, null. */
export function separarHoraPegada(valor: string): { texto: string; periodo: 'am' | 'pm' } | null {
  const partes = /^\s*(\d{1,2}:\d{2})\s*([ap])\.?\s*m\.?\s*$/i.exec(valor)
  return partes ? { texto: partes[1], periodo: partes[2].toLowerCase() === 'a' ? 'am' : 'pm' } : null
}
