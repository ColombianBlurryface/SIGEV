import { env } from '@/config/env'
import { sesionStorage } from '@/lib/storage'

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

export async function apiRequest<T>(ruta: string, { method = 'GET', body }: OpcionesPeticion = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
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
    const mensaje =
      respuesta.status === 400 && detalle ? detalle : (error ?? 'Ocurrió un error inesperado. Intenta de nuevo.')
    throw new ApiError(mensaje, respuesta.status)
  }

  return datos as T
}
