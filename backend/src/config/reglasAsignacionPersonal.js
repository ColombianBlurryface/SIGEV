/**
 * Reglas de la asignación de meseros a un evento (HU-28 · RF-35). La pantalla repite lo necesario en
 * frontend/src/lib/reglasAsignacion.ts.
 *
 * La asignación es una SINCRONIZACIÓN COMPLETA: el cuerpo trae la lista final de meseros del evento y reemplaza la
 * anterior (quien no viene en la lista se desasigna; una lista vacía los desasigna a todos). Así el selector de la
 * pantalla solo envía lo que quedó marcado.
 */
const MAX_ASIGNADOS = 100;       // más que esto es casi seguro un error (un evento de 600 personas requiere 30 meseros)
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

module.exports = { MAX_ASIGNADOS, ESTADOS_CERRADOS, esIdValido, idDeRuta, compararConRequeridos, validarAsignacion };
