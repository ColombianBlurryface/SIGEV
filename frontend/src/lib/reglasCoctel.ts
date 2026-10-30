/**
 * Reglas de las recetas de cóctel y del cálculo de licor (HU-44, HU-45, RN-15). Deben coincidir con
 * backend/src/config/reglasCoctel.js. Los errores se muestran junto al campo mientras se escribe.
 */
import { formatearNumero } from './formato'

export const ML_MAX_POR_LICOR = 250
export const DECIMALES_ML = 2
export const MAX_LICORES_POR_RECETA = 6
export const ASISTENTES_MIN = 40
export const ASISTENTES_MAX = 600
export const POR_PERSONA_MIN = 1
export const POR_PERSONA_MAX = 10

const esNumeroEscrito = (texto: string) => /^\d+([.,]\d+)?$/.test(texto.trim())
const aNumero = (texto: string) => Number(texto.trim().replace(',', '.'))

/** Lee los mililitros escritos (acepta coma o punto). null si no es un número. */
export const leerMl = (texto: string): number | null => (esNumeroEscrito(texto) ? aNumero(texto) : null)

/** Error de los mililitros de un licor; undefined si están bien. Vacío solo es error cuando ya se intentó guardar. */
export function errorMl(texto: string, intento = true): string | undefined {
  if (texto.trim() === '') return intento ? 'Indica los mililitros.' : undefined
  if (!esNumeroEscrito(texto) || aNumero(texto) <= 0) return 'Debe ser un número mayor a 0.'
  if (aNumero(texto) > ML_MAX_POR_LICOR) return `Máximo ${formatearNumero(ML_MAX_POR_LICOR)} ml por licor (escribiste ${formatearNumero(aNumero(texto))}).`
  if (Math.abs(Math.round(aNumero(texto) * 10 ** DECIMALES_ML) - aNumero(texto) * 10 ** DECIMALES_ML) > 1e-6) return `Máximo ${DECIMALES_ML} decimales.`
  return undefined
}

/** Error de los asistentes de la calculadora (entero de 40 a 600). */
export function errorAsistentesCalculo(texto: string, intento = true): string | undefined {
  if (texto.trim() === '') return intento ? 'Indica los asistentes.' : undefined
  if (!/^\d+$/.test(texto.trim())) return 'Debe ser un número entero.'
  const n = Number(texto)
  if (n < ASISTENTES_MIN || n > ASISTENTES_MAX) return `Debe estar entre ${ASISTENTES_MIN} y ${ASISTENTES_MAX} asistentes.`
  return undefined
}

/** Error de los cócteles por persona (entero de 1 a 10, RN-15). */
export function errorPorPersona(texto: string, intento = true): string | undefined {
  if (texto.trim() === '') return intento ? 'Indica cuántos por persona.' : undefined
  if (!/^\d+$/.test(texto.trim())) return 'Debe ser un número entero.'
  const n = Number(texto)
  if (n < POR_PERSONA_MIN || n > POR_PERSONA_MAX) return `Debe ser un entero de ${POR_PERSONA_MIN} a ${POR_PERSONA_MAX}.`
  return undefined
}
