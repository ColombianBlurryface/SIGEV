const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function formatearFecha(fechaIso: string) {
  if (!fechaIso) return '—'
  const fecha = new Date(`${fechaIso.slice(0, 10)}T00:00:00`)
  return Number.isNaN(fecha.getTime()) ? '—' : formatoFecha.format(fecha).replace(/\./g, '')
}
