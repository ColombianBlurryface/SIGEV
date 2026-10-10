/**
 * Parámetros del sistema que publica el backend (por ahora, el umbral de alquiler).
 */
import { apiRequest } from './api'

export interface Configuracion {
  // Con más asistentes que este número se avisa que probablemente haya que alquilar (RN-03, P-05)
  umbral_alquiler: number
}

export const configuracionService = {
  obtener() {
    return apiRequest<Configuracion>('/configuracion')
  },
}
