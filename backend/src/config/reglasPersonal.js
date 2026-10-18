/**
 * Reglas del personal de servicio de un evento (HU-21 en adelante). Se construye una historia a la vez.
 *
 * HU-21 · Meseros (RF-28, RN-04, RN-12): 1 mesero por cada 20 asistentes, siempre redondeado hacia arriba
 * (función techo), para que nunca falte personal de atención. Se calcula al consultar el evento (no se guarda):
 * así siempre está al día con el número de asistentes. La pantalla repite la constante en
 * frontend/src/lib/reglasPersonal.ts.
 */
const ASISTENTES_POR_MESERO = 20; // RN-04

/**
 * Cantidad de meseros requerida para un número de asistentes.
 *   45 asistentes → 45 / 20 = 2,25 → 3   (RN-12: el redondeo es hacia arriba)
 *   60 asistentes → 3 exactos             12 → 0,6 → 1 (siempre al menos 1 si hay asistentes)
 *    0 asistentes → 0
 * En JavaScript la división ya es decimal (no trunca como la de enteros de Java o C#), así que 45 / 20 es 2,25 y no 2.
 */
const calcularMeseros = (asistentes) => {
  const n = Number(asistentes);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.ceil(n / ASISTENTES_POR_MESERO);
};

module.exports = { ASISTENTES_POR_MESERO, calcularMeseros };
