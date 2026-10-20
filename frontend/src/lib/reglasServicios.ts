/**
 * Reglas de los servicios adicionales (HU-05, RF-06, RN-18). Deben coincidir con backend/src/config/reglasEvento.js.
 *
 * Cada servicio (DJ, música en vivo, sonido, iluminación...) admite de 1 a 5 unidades y sus horas no pueden
 * superar la duración del evento: no hay «DJ ilimitados» ni 300 horas de DJ en un evento de 3 horas.
 * Las horas van en horas completas o medias horas.
 *
 * COR-06: además, las horas de un servicio van de 1 a 5 (aunque el evento dure más) y cada tipo de servicio tiene un
 * tope de unidades por evento, sumando todas sus líneas: 3 DJs, no seis líneas de DJ.
 */
import { formatearNumero } from './formato'

export const UNIDADES_SERVICIO_MIN = 1
export const UNIDADES_SERVICIO_MAX = 5

export const HORAS_SERVICIO_MIN = 1
export const HORAS_SERVICIO_MAX = 5

// Tope de unidades de cada tipo en todo el evento (debe coincidir con backend/src/config/reglasEvento.js)
export const MAXIMO_UNIDADES_POR_TIPO: Record<string, number> = {
  dj: 3,
  musica_en_vivo: 3,
  sonido: 2,
  iluminacion: 2,
  entretenimiento: 3,
  otro: 5,
}

/** Horas máximas de un servicio: 5, o menos si el evento dura menos. */
export const maximoHoras = (duracionHoras: number) =>
  Number.isFinite(duracionHoras) ? Math.min(HORAS_SERVICIO_MAX, duracionHoras) : HORAS_SERVICIO_MAX

/** Unidades que todavía se pueden agregar de un tipo (según lo ya agregado al evento). */
export function unidadesDisponibles(tipo: string, servicios: { tipo: string; cantidad: number }[]): number {
  const maximo = MAXIMO_UNIDADES_POR_TIPO[tipo] ?? UNIDADES_SERVICIO_MAX
  const usadas = servicios.filter((s) => s.tipo === tipo).reduce((suma, s) => suma + s.cantidad, 0)
  return Math.max(0, maximo - usadas)
}

/** Error de las unidades escritas frente al tope del tipo en el evento; undefined si caben. */
export function errorUnidadesPorTipo(
  tipo: string,
  texto: string,
  servicios: { tipo: string; cantidad: number }[],
  etiqueta: string,
): string | undefined {
  if (!tipo || !esUnidadesServicioValida(texto)) return undefined
  const maximo = MAXIMO_UNIDADES_POR_TIPO[tipo] ?? UNIDADES_SERVICIO_MAX
  const disponibles = unidadesDisponibles(tipo, servicios)
  if (Number(texto.trim()) <= disponibles) return undefined
  return disponibles === 0
    ? `Ya agregaste el máximo de «${etiqueta}» para un evento (${maximo}).`
    : `Un evento admite máximo ${maximo} de «${etiqueta}»: solo puedes agregar ${disponibles} más.`
}

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
  if (horas < HORAS_SERVICIO_MIN || horas > HORAS_SERVICIO_MAX) {
    return `Las horas de un servicio van de ${HORAS_SERVICIO_MIN} a ${HORAS_SERVICIO_MAX}.`
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
