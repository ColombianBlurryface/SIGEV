const formatoFecha = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const formatoFechaCorta = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })
const formatoNumero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 })
const formatoMoneda = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0, useGrouping: 'always' })

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

export function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

export function hoyIso() {
  const hoy = new Date()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')
  return `${hoy.getFullYear()}-${mes}-${dia}`
}
