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

// ---------------------------------------------------------------------------------------------------------------------
// HU-22 · Cocineros para una cena (RF-29, RN-05): (asistentes ÷ 30, redondeado hacia arriba) × 2, con mínimo de 2.
// Solo aplica a los eventos con servicio de cena; en los demás el resultado es 0.
export const ASISTENTES_POR_GRUPO_COCINA = 30 // RN-05
export const COCINEROS_POR_GRUPO = 2
export const MINIMO_COCINEROS_CENA = 2

export const reglaCocina = `${COCINEROS_POR_GRUPO} cocineros por cada ${ASISTENTES_POR_GRUPO_COCINA} asistentes (mínimo ${MINIMO_COCINEROS_CENA})`

/** Cena de 90 asistentes → 3 grupos × 2 = 6; de 40 → 2 grupos × 2 = 4; de 10 → 2 (el mínimo); otro servicio → 0. */
export function calcularCocineros(asistentes: number | null | undefined, servicio: string | null | undefined): number {
  if (servicio !== 'cena') return 0
  if (asistentes === null || asistentes === undefined || !Number.isFinite(asistentes) || asistentes <= 0) return 0
  return Math.max(MINIMO_COCINEROS_CENA, Math.ceil(asistentes / ASISTENTES_POR_GRUPO_COCINA) * COCINEROS_POR_GRUPO)
}

/** Cómo se llegó al número: «90 ÷ 30 = 3 grupos × 2 = 6 cocineros»; con el mínimo, «… → se aplica el mínimo de 2». */
export function explicarCocineros(asistentes: number): string {
  const grupos = Math.ceil(asistentes / ASISTENTES_POR_GRUPO_COCINA)
  const base = asistentes / ASISTENTES_POR_GRUPO_COCINA
  const division = Number.isInteger(base)
    ? `${formatearNumero(asistentes)} ÷ ${ASISTENTES_POR_GRUPO_COCINA} = ${formatearNumero(grupos)}`
    : `${formatearNumero(asistentes)} ÷ ${ASISTENTES_POR_GRUPO_COCINA} = ${formatearNumero(base)} → ${formatearNumero(grupos)} ${grupos === 1 ? 'grupo' : 'grupos'}`
  const calculados = grupos * COCINEROS_POR_GRUPO
  const final = Math.max(MINIMO_COCINEROS_CENA, calculados)
  return `${division} × ${COCINEROS_POR_GRUPO} = ${formatearNumero(final)} cocineros${final > calculados ? ' (mínimo)' : ''}`
}
