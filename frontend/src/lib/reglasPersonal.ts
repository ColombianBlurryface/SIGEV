/**
 * Reglas del personal de servicio de un evento (HU-21 en adelante). Deben coincidir con
 * backend/src/config/reglasPersonal.js. Se construye una historia a la vez.
 *
 * HU-21 · Meseros (RF-28, RN-04, RN-12): 1 mesero por cada 20 asistentes, siempre redondeado hacia arriba.
 * HU-22 · Cocineros (RF-29, RN-05, RN-12): 2 por cada 25 asistentes (grupos de 25 redondeados hacia arriba), igual
 * para todos los eventos: no depende del tipo de evento ni de la comida.
 */
import { formatearNumero } from './formato'

export const ASISTENTES_POR_MESERO = 20 // RN-04
export const ASISTENTES_POR_GRUPO_COCINA = 25 // RN-05
export const COCINEROS_POR_GRUPO = 2 // RN-05

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

/** 100 asistentes → 4 grupos → 8; 320 → 12,8 → 13 grupos → 26; 51 → 3 grupos → 6; 0 → 0. El techo va ANTES de multiplicar por 2. */
export function calcularCocineros(asistentes: number | null | undefined): number {
  if (asistentes === null || asistentes === undefined || !Number.isFinite(asistentes) || asistentes <= 0) return 0
  return Math.ceil(asistentes / ASISTENTES_POR_GRUPO_COCINA) * COCINEROS_POR_GRUPO
}

export const relacionCocineros = `${COCINEROS_POR_GRUPO} por cada ${ASISTENTES_POR_GRUPO_COCINA} asistentes`

/** La cuenta a la vista: «320 ÷ 25 = 12,8 → se redondea hacia arriba a 13 grupos × 2 = 26 cocineros». */
export function explicarCocineros(asistentes: number): string {
  const base = asistentes / ASISTENTES_POR_GRUPO_COCINA
  const grupos = Math.ceil(base)
  const cocineros = calcularCocineros(asistentes)
  const cuenta = `${formatearNumero(asistentes)} ÷ ${ASISTENTES_POR_GRUPO_COCINA}`
  const textoGrupos = `${formatearNumero(grupos)} ${grupos === 1 ? 'grupo' : 'grupos'}`
  return Number.isInteger(base)
    ? `${cuenta} = ${textoGrupos} × ${COCINEROS_POR_GRUPO} = ${formatearNumero(cocineros)} cocineros`
    : `${cuenta} = ${formatearNumero(base)} → se redondea hacia arriba a ${textoGrupos} × ${COCINEROS_POR_GRUPO} = ${formatearNumero(cocineros)} cocineros`
}
