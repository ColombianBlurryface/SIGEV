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

module.exports = { MAX_ASIGNADOS, ESTADOS_CERRADOS, esIdValido, idDeRuta, compararConRequeridos, validarAsignacion, seCruzan };
