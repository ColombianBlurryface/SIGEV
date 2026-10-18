/**
 * Reglas de los servicios adicionales (HU-05, RF-06, RN-18). Deben coincidir con backend/src/config/reglasEvento.js.
 *
 * Cada servicio (DJ, música en vivo, sonido, iluminación...) admite de 1 a 5 unidades y sus horas no pueden
 * superar la duración del evento: no hay «DJ ilimitados» ni 300 horas de DJ en un evento de 3 horas.
 * Las horas van en horas completas o medias horas.
 */
import { formatearNumero } from './formato'

export const UNIDADES_SERVICIO_MIN = 1
export const UNIDADES_SERVICIO_MAX = 5

export const MENSAJE_UNIDADES_SERVICIO = `Las unidades deben ser un número entero de ${UNIDADES_SERVICIO_MIN} a ${UNIDADES_SERVICIO_MAX}.`

// Se revisa el texto tal como se escribió: «2,5», «0» o «6» no son válidos
export function esUnidadesServicioValida(texto: string): boolean {
  const limpio = texto.trim()
  if (!/^\d+$/.test(limpio)) return false
  const numero = Number(limpio)
  return numero >= UNIDADES_SERVICIO_MIN && numero <= UNIDADES_SERVICIO_MAX
}

// Lee las horas escritas (acepta coma o punto decimal). Devuelve null si no es un número mayor a 0 en medias horas.
export function leerHoras(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(limpio)) return null
  const numero = Number(limpio)
  return numero > 0 && Number.isInteger(numero * 2) ? numero : null
}

/** Mensaje de error de las horas escritas frente a la duración del evento; undefined si están bien. */
export function errorHoras(texto: string, duracionHoras: number): string | undefined {
  if (texto.trim() === '') return 'Indica las horas del servicio.'
  const horas = leerHoras(texto)
  if (horas === null) return 'Las horas deben ser un número mayor a 0, en horas completas o medias horas.'
  if (Number.isFinite(duracionHoras) && horas > duracionHoras) {
    return `Las horas no pueden superar la duración del evento (${formatearNumero(duracionHoras)} h).`
  }
  return undefined
}

export const describirHoras = (horas: number) => `${formatearNumero(horas)} ${horas === 1 ? 'hora' : 'horas'}`

interface ServicioConHoras {
  tipo: string
  descripcion: string
  horas: number
}

/** Servicios cuyas horas superan la duración del evento (por ejemplo, porque se acortó el evento después). */
export function serviciosFueraDeDuracion<T extends ServicioConHoras>(servicios: T[], duracionHoras: number): T[] {
  if (!Number.isFinite(duracionHoras)) return []
  return servicios.filter((s) => s.horas > duracionHoras)
}
