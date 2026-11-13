/**
 * Reglas del registro de meseros (HU-26 · RF-33). Deben coincidir con backend/src/config/reglasRegistroPersonal.js.
 * Un mesero lleva su nombre completo (solo letras) y UN contacto de máximo 15 caracteres que traiga de verdad un
 * teléfono (mínimo 7 dígitos) o un correo.
 */
export const NOMBRE_MIN = 2
export const NOMBRE_MAX = 150
export const CONTACTO_MAX = 15 // un teléfono o un correo corto (decisión del PO)
export const DIGITOS_TELEFONO_MIN = 7

export const limpiarEspacios = (texto: string) => texto.replace(/\s+/g, ' ').trim()

const NOMBRE_VALIDO = /^[\p{L}\p{M}][\p{L}\p{M}'’.\- ]*$/u
const CONTACTO_VALIDO = /^[\p{L}\p{N}\p{M} +\-()./@_,:;#]+$/u
const CORREO = /[^\s@/]+@[^\s@/]+\.[^\s@/]{2,}/

/** Error del nombre; undefined si está bien. Vacío solo es error cuando ya se intentó guardar. */
export function errorNombre(texto: string, intento = true): string | undefined {
  const nombre = limpiarEspacios(texto)
  if (nombre === '') return intento ? 'Escribe el nombre completo.' : undefined
  if (nombre.length < NOMBRE_MIN) return `El nombre debe tener al menos ${NOMBRE_MIN} letras.`
  if (nombre.length > NOMBRE_MAX) return `El nombre admite máximo ${NOMBRE_MAX} caracteres.`
  if (!NOMBRE_VALIDO.test(nombre)) return 'Solo letras, espacios, apóstrofos, puntos y guiones (sin números).'
  return undefined
}

/** Error del contacto; undefined si está bien. */
export function errorContacto(texto: string, intento = true): string | undefined {
  const contacto = limpiarEspacios(texto)
  if (contacto === '') return intento ? 'El contacto es obligatorio.' : undefined
  if (contacto.length > CONTACTO_MAX) return `El contacto admite máximo ${CONTACTO_MAX} caracteres.`
  const digitos = (contacto.match(/\d/g) ?? []).length
  if (!CONTACTO_VALIDO.test(contacto) || (!CORREO.test(contacto) && digitos < DIGITOS_TELEFONO_MIN)) {
    return `Escribe un teléfono (mínimo ${DIGITOS_TELEFONO_MIN} dígitos) o un correo válido.`
  }
  return undefined
}
