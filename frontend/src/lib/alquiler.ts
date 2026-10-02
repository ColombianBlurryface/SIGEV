/**
 * HU-12 (RF-14): reparto del mobiliario de un evento entre unidades propias y unidades a alquilar.
 * Es la misma cuenta que hace el backend al consultar un evento: lo que alcanza con el
 * inventario es propio y lo que falta se alquila. Sin elemento de inventario, todo se alquila.
 */
import { formatearNumero } from './formato'

export interface RepartoMobiliario {
  propias: number
  alquilar: number
}

export type OrigenMobiliario = 'propio' | 'alquiler' | 'mixto'

/** Reparte la cantidad pedida según lo disponible en el inventario (null = no está en el inventario). */
export function repartirMobiliario(cantidad: number, disponible: number | null): RepartoMobiliario {
  const propias = Math.min(cantidad, Math.max(disponible ?? 0, 0))
  return { propias, alquilar: cantidad - propias }
}

/** Propio si alcanza todo, alquiler si no hay nada propio, mixto si es una parte y parte. */
export function origenMobiliario({ propias, alquilar }: RepartoMobiliario): OrigenMobiliario {
  if (alquilar === 0) return 'propio'
  return propias === 0 ? 'alquiler' : 'mixto'
}

/** Texto corto del reparto, por ejemplo «350 propias · 50 a alquilar». */
export function describirReparto({ propias, alquilar }: RepartoMobiliario) {
  if (alquilar === 0) return `${formatearNumero(propias)} propias`
  if (propias === 0) return `${formatearNumero(alquilar)} a alquilar`
  return `${formatearNumero(propias)} propias · ${formatearNumero(alquilar)} a alquilar`
}

/** Total de unidades a alquilar de una lista de mobiliario. */
export const totalAlquilar = (repartos: RepartoMobiliario[]) => repartos.reduce((suma, r) => suma + r.alquilar, 0)
