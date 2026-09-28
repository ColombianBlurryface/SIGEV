/**
 * Llamadas a la API de autenticación.
 */
import type { Credenciales, LoginResponse } from '@/types/auth'
import { apiRequest } from './api'

export const authService = {
  login(credenciales: Credenciales) {
    return apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: credenciales })
  },
}
