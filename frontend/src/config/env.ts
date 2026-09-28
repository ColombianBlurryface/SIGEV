/**
 * Configuración leída de las variables de entorno (frontend/.env).
 * apiUrl es la dirección base del backend, sin barra al final (ej. http://localhost:3000/api).
 */
export const env = {
  apiUrl: (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api').replace(/\/$/, ''),
}
