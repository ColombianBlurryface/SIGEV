/**
 * Reglas de las bebidas individuales (RF-22, RN-15).
 *
 * Las unidades por persona de una bebida individual (cerveza, gaseosa, agua...) son un número
 * ENTERO de 1 a 10: no se sirven 1,4 gaseosas por persona. Se valida igual al guardar un producto
 * del catálogo y al agregar la bebida a un evento. Las bebidas compartidas (por botella) no usan
 * esta regla: su consumo sale del tamaño de la porción.
 */
const UNIDADES_POR_PERSONA_MIN = 1;
const UNIDADES_POR_PERSONA_MAX = 10;

const esUnidadesPorPersonaValida = (valor) =>
  typeof valor === 'number' &&
  Number.isInteger(valor) &&
  valor >= UNIDADES_POR_PERSONA_MIN &&
  valor <= UNIDADES_POR_PERSONA_MAX;

const MENSAJE_UNIDADES_POR_PERSONA = `Las unidades por persona deben ser un número entero de ${UNIDADES_POR_PERSONA_MIN} a ${UNIDADES_POR_PERSONA_MAX}.`;

module.exports = {
  UNIDADES_POR_PERSONA_MIN,
  UNIDADES_POR_PERSONA_MAX,
  esUnidadesPorPersonaValida,
  MENSAJE_UNIDADES_POR_PERSONA
};
