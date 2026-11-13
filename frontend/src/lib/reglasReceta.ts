/**
 * Reglas de las recetas de los platos (HU-46 · RF-54). Deben coincidir con backend/src/config/reglasReceta.js.
 *
 * Una receta lista los ingredientes de un plato con lo que consume UNA persona. Unidades permitidas, únicas:
 * gramos, kilos, libras y arrobas. La cantidad es un número mayor a 0 con máximo 3 decimales y una porción no pasa
 * de 1 kg por persona.
 */
import { formatearNumero } from './formato'
import type { UnidadReceta } from '@/types/recetas'

// Equivalencia en gramos: en Colombia la libra comercial es de 500 g y la arroba de 25 libras
export const UNIDADES_RECETA: { valor: UnidadReceta; etiqueta: string; corta: string; gramos: number }[] = [
  { valor: 'gramo', etiqueta: 'Gramos', corta: 'g', gramos: 1 },
  { valor: 'kilo', etiqueta: 'Kilos', corta: 'kg', gramos: 1000 },
  { valor: 'libra', etiqueta: 'Libras', corta: 'lb', gramos: 500 },
  { valor: 'arroba', etiqueta: 'Arrobas', corta: '@', gramos: 12500 },
]

export const INGREDIENTES_MAX = 30
export const NOMBRE_MAX = 100
export const DECIMALES_MAX = 3
export const GRAMOS_POR_PERSONA_MAX = 1000

export const etiquetaUnidad = (unidad: UnidadReceta) => UNIDADES_RECETA.find((u) => u.valor === unidad)?.etiqueta.toLowerCase() ?? unidad
export const gramosDe = (cantidad: number, unidad: UnidadReceta) =>
  Number((cantidad * (UNIDADES_RECETA.find((u) => u.valor === unidad)?.gramos ?? 1)).toFixed(6))

/** Para comparar nombres: sin mayúsculas, sin tildes y sin espacios repetidos («Pimentón» = «pimenton»). */
export const claveNombre = (nombre: string) =>
  nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

// Lee la cantidad escrita (acepta coma o punto decimal). Devuelve null si no es un número.
export function leerCantidad(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.')
  return /^\d+(\.\d+)?$/.test(limpio) ? Number(limpio) : null
}

export interface LineaEditable {
  id: string
  nombre: string
  cantidad: string
  unidadPorcion: UnidadReceta
  unidadCompra: UnidadReceta
}

export interface ErroresLinea {
  nombre?: string
  cantidad?: string
}

/** Errores de una línea frente a las demás (nombre repetido incluido); {} si está bien. */
export function erroresLinea(linea: LineaEditable, todas: LineaEditable[]): ErroresLinea {
  const errores: ErroresLinea = {}
  const nombre = linea.nombre.replace(/\s+/g, ' ').trim()
  if (nombre === '') errores.nombre = 'Escribe el nombre del ingrediente.'
  else if (nombre.length > NOMBRE_MAX) errores.nombre = `Máximo ${NOMBRE_MAX} caracteres.`
  else if (todas.filter((l) => claveNombre(l.nombre) === claveNombre(nombre)).length > 1) {
    errores.nombre = 'Este ingrediente está repetido: suma las cantidades en una sola línea.'
  }

  const cantidad = leerCantidad(linea.cantidad)
  if (linea.cantidad.trim() === '') errores.cantidad = 'Indica la cantidad por porción.'
  else if (cantidad === null || cantidad <= 0) errores.cantidad = 'Debe ser un número mayor a 0.'
  else if (Math.abs(Math.round(cantidad * 10 ** DECIMALES_MAX) - cantidad * 10 ** DECIMALES_MAX) > 1e-6) {
    errores.cantidad = `Máximo ${DECIMALES_MAX} decimales.`
  } else if (gramosDe(cantidad, linea.unidadPorcion) > GRAMOS_POR_PERSONA_MAX) {
    errores.cantidad = `Equivale a ${formatearNumero(gramosDe(cantidad, linea.unidadPorcion))} g por persona; el máximo es ${formatearNumero(GRAMOS_POR_PERSONA_MAX)} g (1 kg).`
  }
  return errores
}

/** Mensaje si la receta no se puede guardar todavía (sin ingredientes o con errores); undefined si está lista. */
export function errorReceta(lineas: LineaEditable[]): string | undefined {
  if (lineas.length === 0) return 'La receta debe tener al menos un ingrediente.'
  if (lineas.length > INGREDIENTES_MAX) return `Una receta admite máximo ${INGREDIENTES_MAX} ingredientes.`
  const hayErrores = lineas.some((l) => Object.keys(erroresLinea(l, lineas)).length > 0)
  return hayErrores ? 'Corrige los ingredientes marcados antes de guardar.' : undefined
}

const SINGULAR_UNIDAD: Record<UnidadReceta, string> = { gramo: 'gramo', kilo: 'kilo', libra: 'libra', arroba: 'arroba' }
/** «1 kilo», «22 kilos», «1 arroba», «3 arrobas»: la unidad en singular o plural según la cantidad. */
export const unidadConCantidad = (cantidad: number, unidad: UnidadReceta) =>
  `${formatearNumero(cantidad)} ${cantidad === 1 ? SINGULAR_UNIDAD[unidad] : etiquetaUnidad(unidad)}`
