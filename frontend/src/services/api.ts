/**
 * Cliente HTTP de la aplicación. Todas las llamadas al backend pasan por apiRequest:
 * arma la URL, agrega el token de sesión y convierte los errores del servidor en mensajes claros.
 */
import { env } from '@/config/env'
import { sesionStorage } from '@/lib/storage'

/**
 * Error que devuelve el backend. status es el código HTTP (400, 401, 404, 409, 500...)
 * o 0 si ni siquiera se pudo conectar con el servidor.
 */
export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface OpcionesPeticion {
  method?: Metodo
  body?: unknown
}

/**
 * Hace una petición al backend y devuelve la respuesta ya convertida desde JSON.
 * Ejemplo: apiRequest<Evento[]>('/eventos') o apiRequest('/eventos', { method: 'POST', body: datos })
 */
export async function apiRequest<T>(ruta: string, { method = 'GET', body }: OpcionesPeticion = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  // Si hay sesión, se envía el token en la cabecera Authorization
  const token = sesionStorage.leer()?.token
  if (token) headers.Authorization = `Bearer ${token}`

  let respuesta: Response
  try {
    respuesta = await fetch(`${env.apiUrl}${ruta}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Verifica que el backend esté encendido.', 0)
  }

  const datos = await respuesta.json().catch(() => null)

  if (!respuesta.ok) {
    const { error, detalle } = (datos ?? {}) as { error?: string; detalle?: string }
    // En errores de validación (400) el backend explica el motivo en "detalle"; en los demás, en "error"
    const mensaje =
      respuesta.status === 400 && detalle ? detalle : (error ?? 'Ocurrió un error inesperado. Intenta de nuevo.')
    throw new ApiError(mensaje, respuesta.status)
  }

  return datos as T
}
