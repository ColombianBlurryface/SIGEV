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

// ---------------------------------------------------------------------------------------------------------------------
// HU-22 · Cocineros para una cena (RF-29, RN-05):  (asistentes ÷ 30, redondeado hacia arriba) × 2, con mínimo de 2.
// Solo aplica a los eventos con servicio de cena; en los demás el resultado es 0.
const ASISTENTES_POR_GRUPO_COCINA = 30; // RN-05
const COCINEROS_POR_GRUPO = 2;
const MINIMO_COCINEROS_CENA = 2;

// Tipos de servicio de comida del evento (valor guardado y nombre). Hoy solo la cena calcula cocineros.
const TIPOS_SERVICIO_COMIDA = {
  cena: 'Cena',
  coctel: 'Cóctel',
  buffet: 'Buffet',
  refrigerio: 'Refrigerio',
  otro: 'Otro'
};

/**
 * Cocineros requeridos según el tipo de servicio y los asistentes.
 *   cena, 90 asistentes → 90 / 30 = 3 grupos → 3 × 2 = 6      cena, 40 → 1,33 → 2 grupos → 4
 *   cena, 10 asistentes → 1 grupo → 2 (el mínimo)             cóctel, 100 → 0 (la regla de cena no aplica)
 *   cena, 0 asistentes → 0
 */
const calcularCocineros = (asistentes, tipoServicio) => {
  if (tipoServicio !== 'cena') return 0;
  const n = Number(asistentes);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const grupos = Math.ceil(n / ASISTENTES_POR_GRUPO_COCINA);
  return Math.max(MINIMO_COCINEROS_CENA, grupos * COCINEROS_POR_GRUPO);
};

module.exports = {
  ASISTENTES_POR_MESERO,
  calcularMeseros,
  ASISTENTES_POR_GRUPO_COCINA,
  COCINEROS_POR_GRUPO,
  MINIMO_COCINEROS_CENA,
  TIPOS_SERVICIO_COMIDA,
  calcularCocineros
};
