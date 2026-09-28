/**
 * Lectura del token de sesión (JWT) en el navegador.
 */
interface JwtPayload {
  exp?: number
}

/**
 * Indica si el token ya venció, leyendo su fecha de expiración (exp).
 * Un JWT tiene tres partes separadas por puntos; la del medio (payload) es JSON en base64.
 * Solo se lee para saber si venció: la validez real del token la comprueba el backend.
 */
export function tokenExpirado(token: string) {
  try {
    const payload = token.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const { exp } = JSON.parse(json) as JwtPayload
    return typeof exp === 'number' && exp * 1000 <= Date.now()
  } catch {
    return true
  }
}
