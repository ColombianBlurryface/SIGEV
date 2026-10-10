/**
 * Funciones para mostrar datos en formato colombiano (es-CO): fechas, números y dinero.
 * También incluye utilidades de texto para búsquedas.
 */
const formatoFecha = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const formatoFechaCorta = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })
const formatoFechaHora = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
const formatoNumero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 })
const formatoMoneda = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0, useGrouping: 'always' })

// Convierte '2026-11-14' (o una fecha ISO completa) en fecha local, sin desfases por zona horaria
function aFecha(fechaIso: string) {
  const fecha = new Date(`${fechaIso.slice(0, 10)}T00:00:00`)
  return Number.isNaN(fecha.getTime()) ? null : fecha
}

const limpiar = (texto: string) => texto.replace(/[.,]/g, '')

export function formatearFecha(fechaIso: string) {
  const fecha = fechaIso ? aFecha(fechaIso) : null
  return fecha ? limpiar(formatoFecha.format(fecha)) : '—'
}

export function formatearFechaCorta(fechaIso: string) {
  const fecha = fechaIso ? aFecha(fechaIso) : null
  return fecha ? limpiar(formatoFechaCorta.format(fecha)) : '—'
}

export function formatearNumero(valor: string | number) {
  const numero = Number(valor)
  return Number.isFinite(numero) ? formatoNumero.format(numero) : '—'
}

export function formatearMoneda(valor: string | number) {
  const numero = Number(valor)
  return Number.isFinite(numero) ? `$${formatoMoneda.format(numero)}` : '—'
}

export function capitalizar(texto: string) {
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto
}

/** Quita tildes y pasa a minúsculas para buscar sin importar cómo se escriba: "César" -> "cesar". */
export function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

/** Fecha de hoy en formato AAAA-MM-DD, para comparar con las fechas de los eventos. */
export function hoyIso() {
  const hoy = new Date()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')
  return `${hoy.getFullYear()}-${mes}-${dia}`
}

export function formatearFechaHora(fechaIso: string) {
  const fecha = new Date(fechaIso)
  return Number.isNaN(fecha.getTime()) ? '—' : formatoFechaHora.format(fecha)
}
