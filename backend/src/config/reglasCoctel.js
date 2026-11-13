/**
 * Reglas de las recetas de cóctel y del cálculo de licor (HU-44 · RF-52, HU-45 · RF-53, RN-15). Se revisan aquí, de
 * forma estricta, ANTES de tocar la base de datos: un texto como «50abc», un decimal de más o un id con letras
 * dejaban pasar datos raros o daban un error 500. La pantalla repite los límites en frontend/src/lib/reglasCoctel.ts.
 */
const ML_MAX_POR_LICOR = 250;        // un trago no lleva más de 250 ml de un licor
const DECIMALES_ML = 2;              // la base guarda los mililitros con 2 decimales
const MAX_LICORES_POR_RECETA = 6;
const NOMBRE_MAX = 150;              // igual que la columna cocteles.nombre
const DESCRIPCION_MAX = 500;
const ASISTENTES_MIN = 40;           // RN-01
const ASISTENTES_MAX = 600;
const POR_PERSONA_MIN = 1;           // RN-15: entero de 1 a 10
const POR_PERSONA_MAX = 10;
const MAX_COCTELES_EN_CALCULO = 20;
const ID_MAX = 2147483647;

const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const esIdValido = (v) => Number.isInteger(v) && v >= 1 && v <= ID_MAX;
const tieneDecimalesValidos = (n, max) => Math.abs(Math.round(n * 10 ** max) - n * 10 ** max) < 1e-6;

/** Id que llega por la ruta (texto): devuelve el número, o null si no es un entero positivo válido. */
const idDeRuta = (texto) => (/^\d+$/.test(String(texto)) && esIdValido(Number(texto)) ? Number(texto) : null);

/** Revisa { nombre, descripcion, ingredientes: [{ licor_id, mililitros }] }. Devuelve { error } o los datos limpios. */
const validarCoctel = (body) => {
  if (!esObjeto(body)) return { error: 'El cuerpo de la petición debe ser un objeto JSON.' };
  const { nombre, descripcion, ingredientes } = body;

  if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > NOMBRE_MAX) {
    return { error: `El nombre del cóctel es obligatorio y admite máximo ${NOMBRE_MAX} caracteres.` };
  }
  if (descripcion !== undefined && descripcion !== null && (typeof descripcion !== 'string' || descripcion.length > DESCRIPCION_MAX)) {
    return { error: `La descripción debe ser texto de máximo ${DESCRIPCION_MAX} caracteres.` };
  }
  if (!Array.isArray(ingredientes) || ingredientes.length === 0) return { error: 'Debe incluir al menos un licor en la receta.' };
  if (ingredientes.length > MAX_LICORES_POR_RECETA) return { error: `Una receta no puede tener más de ${MAX_LICORES_POR_RECETA} licores.` };

  const vistos = new Set();
  const limpios = [];
  for (const [i, ing] of ingredientes.entries()) {
    if (!esObjeto(ing)) return { error: `El licor ${i + 1} de la receta no es válido.` };
    if (!esIdValido(ing.licor_id)) return { error: `El licor ${i + 1} no es válido: elige un licor de la lista.` };
    if (vistos.has(ing.licor_id)) return { error: 'No puedes seleccionar el mismo licor más de una vez en la receta.' };
    vistos.add(ing.licor_id);
    const ml = ing.mililitros;
    if (typeof ml !== 'number' || !Number.isFinite(ml) || ml <= 0 || ml > ML_MAX_POR_LICOR) {
      return { error: `Los mililitros deben ser un número mayor a 0 y máximo ${ML_MAX_POR_LICOR} ml por licor.` };
    }
    if (!tieneDecimalesValidos(ml, DECIMALES_ML)) return { error: `Los mililitros admiten máximo ${DECIMALES_ML} decimales.` };
    limpios.push({ licor_id: ing.licor_id, mililitros: ml });
  }
  return { nombre: nombre.trim(), descripcion: typeof descripcion === 'string' && descripcion.trim() ? descripcion.trim() : null, ingredientes: limpios };
};

/** Revisa { asistentes, cocteles: [{ coctel_id, cocteles_por_persona }] } del cálculo de licor (HU-45). */
const validarCalculo = (body) => {
  if (!esObjeto(body)) return { error: 'El cuerpo de la petición debe ser un objeto JSON.' };
  const { asistentes, cocteles } = body;
  if (!Number.isInteger(asistentes) || asistentes < ASISTENTES_MIN || asistentes > ASISTENTES_MAX) {
    return { error: `La cantidad de asistentes debe ser un número entero de ${ASISTENTES_MIN} a ${ASISTENTES_MAX}.` };
  }
  if (cocteles === undefined || cocteles === null) return { asistentes, cocteles: [] };
  if (!Array.isArray(cocteles) || cocteles.length > MAX_COCTELES_EN_CALCULO) {
    return { error: `cocteles debe ser una lista de máximo ${MAX_COCTELES_EN_CALCULO} cócteles.` };
  }
  const vistos = new Set();
  for (const [i, c] of cocteles.entries()) {
    if (!esObjeto(c) || !esIdValido(c.coctel_id)) return { error: `El cóctel ${i + 1} no es válido: elige un cóctel de la lista.` };
    if (vistos.has(c.coctel_id)) return { error: 'El mismo cóctel está repetido: cada cóctel se agrega una sola vez.' };
    vistos.add(c.coctel_id);
    if (!Number.isInteger(c.cocteles_por_persona) || c.cocteles_por_persona < POR_PERSONA_MIN || c.cocteles_por_persona > POR_PERSONA_MAX) {
      return { error: `Los cócteles por persona deben ser un número entero entre ${POR_PERSONA_MIN} y ${POR_PERSONA_MAX}.` };
    }
  }
  return { asistentes, cocteles: cocteles.map((c) => ({ coctel_id: c.coctel_id, cocteles_por_persona: c.cocteles_por_persona })) };
};

module.exports = {
  ML_MAX_POR_LICOR, DECIMALES_ML, MAX_LICORES_POR_RECETA, NOMBRE_MAX, DESCRIPCION_MAX,
  ASISTENTES_MIN, ASISTENTES_MAX, POR_PERSONA_MIN, POR_PERSONA_MAX, MAX_COCTELES_EN_CALCULO,
  esIdValido, idDeRuta, validarCoctel, validarCalculo
};
