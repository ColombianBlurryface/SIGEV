export const ASISTENTES_MIN = 40
export const ASISTENTES_MAX = 600
export const BUFFET_DESDE = 301
export const DURACION_MAX_HORAS = 99

export type EstadoAsistentes = 'vacio' | 'bajo' | 'alto' | 'valido'

export interface ValidacionAsistentes {
  estado: EstadoAsistentes
  cantidad: number | null
  esBuffet: boolean
  mensaje: string | null
}

export function validarAsistentes(valor: string): ValidacionAsistentes {
  const limpio = valor.trim()
  const cantidad = /^\d+$/.test(limpio) ? Number(limpio) : null

  if (cantidad === null) {
    return {
      estado: 'vacio',
      cantidad: null,
      esBuffet: false,
      mensaje: limpio === '' ? 'Ingresa el número de asistentes.' : 'Ingresa un número entero de personas.',
    }
  }
  if (cantidad < ASISTENTES_MIN) {
    return { estado: 'bajo', cantidad, esBuffet: false, mensaje: `El mínimo es ${ASISTENTES_MIN} personas; ingresaste ${cantidad}.` }
  }
  if (cantidad > ASISTENTES_MAX) {
    return { estado: 'alto', cantidad, esBuffet: false, mensaje: `El máximo es ${ASISTENTES_MAX} personas; ingresaste ${cantidad}.` }
  }
  return { estado: 'valido', cantidad, esBuffet: cantidad >= BUFFET_DESDE, mensaje: null }
}

export interface ValoresEvento {
  nombre: string
  tipo: string
  fecha: string
  duracion: string
  asistentes: string
  observaciones: string
}

export type ErroresEvento = Partial<Record<keyof ValoresEvento, string>>

export function validarEvento(valores: ValoresEvento): ErroresEvento {
  const errores: ErroresEvento = {}

  if (!valores.nombre.trim()) errores.nombre = 'Escribe el nombre del evento.'
  else if (valores.nombre.trim().length > 150) errores.nombre = 'El nombre admite máximo 150 caracteres.'

  if (!valores.tipo) errores.tipo = 'Selecciona el tipo de evento.'
  if (!valores.fecha) errores.fecha = 'Selecciona la fecha del evento.'

  const duracion = Number(valores.duracion)
  if (!valores.duracion.trim()) errores.duracion = 'Indica la duración en horas.'
  else if (!Number.isFinite(duracion) || duracion <= 0) errores.duracion = 'La duración debe ser mayor a 0.'
  else if (duracion > DURACION_MAX_HORAS) errores.duracion = `La duración máxima es ${DURACION_MAX_HORAS} horas.`

  const asistentes = validarAsistentes(valores.asistentes)
  if (asistentes.estado !== 'valido') errores.asistentes = asistentes.mensaje ?? undefined

  return errores
}
