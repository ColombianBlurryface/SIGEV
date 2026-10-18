/**
 * Reglas del personal de servicio de un evento (HU-21 en adelante). Deben coincidir con
 * backend/src/config/reglasPersonal.js. Se construye una historia a la vez.
 *
 * HU-21 · Meseros (RF-28, RN-04, RN-12): 1 mesero por cada 20 asistentes, siempre redondeado hacia arriba.
 */
import { formatearNumero } from './formato'

export const ASISTENTES_POR_MESERO = 20 // RN-04

/** 45 asistentes → 2,25 → 3; 60 → 3; 12 → 1; 0 → 0 (RN-12: el redondeo es hacia arriba). */
export function calcularMeseros(asistentes: number | null | undefined): number {
  if (asistentes === null || asistentes === undefined || !Number.isFinite(asistentes) || asistentes <= 0) return 0
  return Math.ceil(asistentes / ASISTENTES_POR_MESERO)
}

export const relacionMeseros = `1 por cada ${ASISTENTES_POR_MESERO} asistentes`

/** Cómo se llegó al número, por transparencia: «45 ÷ 20 = 2,25 → se redondea hacia arriba a 3». */
export function explicarMeseros(asistentes: number): string {
  const base = asistentes / ASISTENTES_POR_MESERO
  const meseros = calcularMeseros(asistentes)
  return Number.isInteger(base)
    ? `${formatearNumero(asistentes)} ÷ ${ASISTENTES_POR_MESERO} = ${formatearNumero(meseros)}`
    : `${formatearNumero(asistentes)} ÷ ${ASISTENTES_POR_MESERO} = ${formatearNumero(base)} → se redondea hacia arriba a ${formatearNumero(meseros)}`
}
