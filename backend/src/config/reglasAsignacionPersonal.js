/**
 * Reglas de la asignación de meseros a un evento (HU-28 · RF-35). La pantalla repite lo necesario en
 * frontend/src/lib/reglasAsignacion.ts.
 *
 * La asignación es una SINCRONIZACIÓN COMPLETA: el cuerpo trae la lista final de meseros del evento y reemplaza la
 * anterior (quien no viene en la lista se desasigna; una lista vacía los desasigna a todos). Así el selector de la
 * pantalla solo envía lo que quedó marcado.
 *
 * Reglas de negocio:
 *   · TOPE: no se pueden asignar más meseros que los que el evento requiere (1 por cada 20 asistentes, HU-21).
 *   · CRUCES: un mesero no puede estar en dos eventos que se cruzan en el tiempo (misma fecha y horas que se pisan).
 *     Si uno termina justo cuando empieza el otro, sí se puede. Un evento SIN hora de inicio (anteriores a esta regla)
 *     ocupa todo el día. Un evento cancelado no cuenta.
 */
// Estado de cada asignación (HU-29 · RF-36). Los códigos de la historia (PENDING, CONFIRMED, UNAVAILABLE) también se entienden.
const ESTADOS_ASIGNACION = ['por_confirmar', 'confirmado', 'no_puede'];
const ESTADO_POR_DEFECTO = 'por_confirmar';
const ESTADO_NO_CUENTA = 'no_puede';   // un mesero que «no puede» no cuenta para el estándar ni bloquea su horario
const ALIAS_ESTADO = {
  por_confirmar: 'por_confirmar', 'por confirmar': 'por_confirmar', pending: 'por_confirmar',
  confirmado: 'confirmado', confirmed: 'confirmado',
  no_puede: 'no_puede', 'no puede': 'no_puede', unavailable: 'no_puede'
};

const MAX_ASIGNADOS = 100;       // tope de seguridad de la petición; el tope real es el número de meseros requeridos
const ID_MAX = 2147483647;
// Estados en los que ya no tiene sentido asignar personal
const ESTADOS_CERRADOS = ['realizado', 'cancelado'];

const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const esIdValido = (v) => Number.isInteger(v) && v >= 1 && v <= ID_MAX;

/** Id que llega por la ruta (texto): devuelve el número, o null si no es un entero positivo válido. */
const idDeRuta = (texto) => (/^\d+$/.test(String(texto)) && esIdValido(Number(texto)) ? Number(texto) : null);

/** Estado logístico de los meseros: cuántos hay asignados frente a los que el evento requiere (HU-21). */
const compararConRequeridos = (asignados, requeridos) => {
  const diferencia = asignados - requeridos;
  return {
    diferencia,
    deficit: Math.max(0, -diferencia),
    excedente: Math.max(0, diferencia),
    estado: diferencia === 0 ? 'completo' : diferencia < 0 ? 'deficit' : 'excedente'
  };
};

/** Texto de un estado (CONFIRMED, «No puede», por_confirmar…) → su código, o null si no es un estado permitido. */
const normalizarEstado = (valor) => (typeof valor === 'string' ? ALIAS_ESTADO[valor.trim().toLowerCase()] || null : null);

/** Revisa { estado } (también se entiende status) del cambio de estado de una asignación. */
const validarEstado = (body) => {
  if (!esObjeto(body)) return { error: 'El cuerpo de la petición debe ser un objeto JSON.' };
  const bruto = body.estado !== undefined ? body.estado : body.status;
  if (bruto === undefined || bruto === null || bruto === '') return { error: `El estado es obligatorio: ${ESTADOS_ASIGNACION.join(', ')}.` };
  const estado = normalizarEstado(bruto);
  if (!estado) return { error: `El estado debe ser uno de: ${ESTADOS_ASIGNACION.join(', ')} (por confirmar, confirmado o no puede).` };
  return { estado };
};

/** Cuántas asignaciones CUENTAN para el estándar: todas menos las de quien «no puede». */
const contarUtiles = (estados) => estados.filter((e) => e !== ESTADO_NO_CUENTA).length;

/** Revisa { personal_ids: [..] } (también se entiende staff_ids). Devuelve { error } o { ids } sin repetidos. */
const validarAsignacion = (body) => {
  if (!esObjeto(body)) return { error: 'El cuerpo de la petición debe ser un objeto JSON.' };
  const lista = body.personal_ids !== undefined ? body.personal_ids : body.staff_ids;
  if (!Array.isArray(lista)) return { error: 'personal_ids debe ser una lista con los ids de los meseros (puede ir vacía para quitarlos a todos).' };
  if (lista.length > MAX_ASIGNADOS) return { error: `Un evento admite máximo ${MAX_ASIGNADOS} meseros asignados.` };
  const vistos = new Set();
  for (const [i, id] of lista.entries()) {
    if (!esIdValido(id)) return { error: `El mesero ${i + 1} de la lista no es válido: cada id debe ser un número entero positivo.` };
    if (vistos.has(id)) return { error: `El mesero con ID ${id} está repetido en la lista: cada mesero se asigna una sola vez.` };
    vistos.add(id);
  }
  return { ids: [...lista] };
};

/**
 * Dos eventos se cruzan si cada uno empieza ANTES de que el otro termine. Con «termina cuando empieza el otro» no se
 * cruzan (22:00 con 18:00 + 4 h). Los instantes son números (minutos desde una misma referencia).
 */
const seCruzan = (iniA, finA, iniB, finB) => iniA < finB && iniB < finA;

module.exports = {
  ESTADOS_ASIGNACION, ESTADO_POR_DEFECTO, ESTADO_NO_CUENTA, normalizarEstado, validarEstado, contarUtiles,
  MAX_ASIGNADOS, ESTADOS_CERRADOS, esIdValido, idDeRuta, compararConRequeridos, validarAsignacion, seCruzan };
