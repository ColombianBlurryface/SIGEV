/**
 * Reglas de negocio para registrar un evento (HU-01 y HU-07).
 * El umbral de alquiler de la HU-12 (RN-03) no está aquí: lo define el backend y se obtiene con useUmbralAlquiler.
 * Son las mismas que valida el backend; aquí se revisan antes de enviar para avisar al usuario de inmediato.
 */
import { hoyIso } from './formato'

// Rango permitido de asistentes (HU-07, RN-01) y desde cuántos asistentes el evento es buffet (RN-02)
export const ASISTENTES_MIN = 40
export const ASISTENTES_MAX = 600
export const BUFFET_DESDE = 301
export const DURACION_MAX_HORAS = 8
export const DURACION_MIN_HORAS = 3
export const MAX_EVENTOS_POR_FECHA = 3 // tope de eventos activos por día (RN-13)
export const ANTICIPACION_MAX_ANIOS = 5 // un evento no se registra para más de 5 años adelante

// Fecha límite hacia adelante: hoy más 5 años (AAAA-MM-DD)
export function fechaMaxima() {
  const hoy = hoyIso()
  return `${Number(hoy.slice(0, 4)) + ANTICIPACION_MAX_ANIOS}${hoy.slice(4)}`
}

export type EstadoAsistentes = 'vacio' | 'bajo' | 'alto' | 'valido'

export interface ValidacionAsistentes {
  estado: EstadoAsistentes
  cantidad: number | null
  esBuffet: boolean
  mensaje: string | null
}

/**
 * Revisa el número de asistentes escrito en el formulario (llega como texto).
 * Devuelve el estado (vacío, bajo, alto o válido), el número, si es buffet y el mensaje a mostrar.
 */
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
  // HU-22: tipo de servicio de comida (cena, coctel, buffet, refrigerio, otro)
  servicio: string
  fecha: string
  duracion: string
  asistentes: string
  observaciones: string
}

export type ErroresEvento = Partial<Record<keyof ValoresEvento, string>>

/**
 * Valida todos los datos del paso 1 del registro.
 * Devuelve un objeto con un mensaje por cada campo con error; si está vacío, todo está bien.
 */
export function validarEvento(valores: ValoresEvento, eventosEnFecha=0): ErroresEvento {
  const errores: ErroresEvento = {}

  if (!valores.nombre.trim()) errores.nombre = 'Escribe el nombre del evento.'
  else if (valores.nombre.trim().length > 150) errores.nombre = 'El nombre admite máximo 150 caracteres.'

  if (!valores.tipo) errores.tipo = 'Selecciona el tipo de evento.'
  if (!valores.servicio) errores.servicio = 'Selecciona el servicio de comida (de él depende el personal de cocina).'
  if (!valores.fecha) {
    errores.fecha = 'Selecciona la fecha del evento.'
  } else if (valores.fecha < hoyIso()) {
    // El selector tiene un mínimo, pero la fecha también se puede escribir a mano: aquí se bloquea de verdad (RN-14)
    errores.fecha = 'La fecha del evento debe ser hoy o posterior: no se puede registrar un evento en el pasado.'
  } else if (valores.fecha > fechaMaxima()) {
    errores.fecha = `La fecha del evento no puede ser más de ${ANTICIPACION_MAX_ANIOS} años en el futuro.`
  } else if (eventosEnFecha >= MAX_EVENTOS_POR_FECHA) {
    errores.fecha = `Ya hay ${MAX_EVENTOS_POR_FECHA} eventos registrados en esta fecha (máximo permitido).`
  }

  const duracion = Number(valores.duracion)
  if (!valores.duracion.trim()) errores.duracion = 'Indica la duración en horas.'
 else if (!Number.isFinite(duracion) || duracion < DURACION_MIN_HORAS || duracion > DURACION_MAX_HORAS) {
    errores.duracion = `La duración en horas debe estar entre ${DURACION_MIN_HORAS} y ${DURACION_MAX_HORAS} horas.`
  }
  const asistentes = validarAsistentes(valores.asistentes)
  if (asistentes.estado !== 'valido') errores.asistentes = asistentes.mensaje ?? undefined

  return errores
}
