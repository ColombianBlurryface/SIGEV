/**
 * Reglas de las bebidas individuales (RF-22, RN-15). Deben coincidir con backend/src/config/reglasBebidas.js.
 *
 * Las unidades por persona de una bebida individual (cerveza, gaseosa, agua...) son un número ENTERO
 * de 1 a 10: no se sirven 1,4 gaseosas por persona. Se valida al registrar las bebidas del evento y
 * al guardar un producto del catálogo. Las bebidas compartidas (por botella) no usan esta regla.
 */
export const UNIDADES_POR_PERSONA_MIN = 1
export const UNIDADES_POR_PERSONA_MAX = 10

export const MENSAJE_UNIDADES_POR_PERSONA = `Las unidades por persona deben ser un número entero de ${UNIDADES_POR_PERSONA_MIN} a ${UNIDADES_POR_PERSONA_MAX}.`

// Se revisa el texto tal como se escribió: «1,4», «1.4» o «2.0» no son enteros y se rechazan (un «+» o un «-» tampoco)
export function esUnidadesPorPersonaValida(texto: string): boolean {
  const limpio = texto.trim()
  if (!/^\d+$/.test(limpio)) return false
  const numero = Number(limpio)
  return numero >= UNIDADES_POR_PERSONA_MIN && numero <= UNIDADES_POR_PERSONA_MAX
}
