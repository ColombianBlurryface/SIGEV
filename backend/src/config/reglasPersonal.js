/**
 * Reglas del personal de servicio de un evento (HU-21 en adelante). Se construye una historia a la vez.
 *
 * HU-21 · Meseros (RF-28, RN-04, RN-12): 1 mesero por cada 20 asistentes, siempre redondeado hacia arriba
 * (función techo), para que nunca falte personal de atención. Se calcula al consultar el evento (no se guarda):
 * así siempre está al día con el número de asistentes. La pantalla repite la constante en
 * frontend/src/lib/reglasPersonal.ts.
 *
 * HU-22 · Cocineros (RF-29, RN-05, RN-12): una sola regla para TODOS los eventos, sin importar el tipo de evento ni la
 * comida que se sirva (cena, buffet, cóctel...): 2 cocineros por cada 25 asistentes, redondeando hacia arriba los
 * grupos de 25. Reemplaza a las antiguas HU-23 y HU-24 (que dependían del tipo de comida): no hay ningún if por
 * menú. También se calcula al consultar el evento y no se guarda.
 */
const ASISTENTES_POR_MESERO = 20; // RN-04
const ASISTENTES_POR_GRUPO_COCINA = 25; // RN-05
const COCINEROS_POR_GRUPO = 2; // RN-05

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

/**
 * Cantidad de cocineros requerida para un número de asistentes: (asistentes ÷ 25, hacia arriba) × 2.
 *   100 asistentes → 4 grupos → 8     320 → 12,8 → 13 grupos → 26     40 → 1,6 → 2 grupos → 4
 *    50 asistentes → 2 grupos → 4      51 → 2,04 → 3 grupos → 6        0 → 0
 * El techo se aplica a los GRUPOS antes de multiplicar por 2 (RN-12): 51 asistentes dan 6 cocineros, no 5. La
 * división de JavaScript es decimal (la de enteros de Java o C# truncaría y daría un grupo de menos).
 */
const calcularCocineros = (asistentes) => {
  const n = Number(asistentes);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.ceil(n / ASISTENTES_POR_GRUPO_COCINA) * COCINEROS_POR_GRUPO;
};

module.exports = {
  ASISTENTES_POR_MESERO, calcularMeseros,
  ASISTENTES_POR_GRUPO_COCINA, COCINEROS_POR_GRUPO, calcularCocineros
};
