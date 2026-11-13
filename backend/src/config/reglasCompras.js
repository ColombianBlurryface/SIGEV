/**
 * Cálculo de los ingredientes a comprar de un evento (HU-47 · RF-55, RN-09, RN-20).
 *
 * Para cada ingrediente de las recetas de los platos del evento:
 *   gramos = asistentes × cantidad por porción (en gramos) × 1,10 (margen del 10 %, RN-09)
 *   a comprar = gramos convertidos a la unidad de compra del ingrediente, redondeados hacia arriba (RN-20)
 * Equivalencias (RN-20): 1 kg = 1.000 g; 1 libra = 500 g; 1 arroba = 12,5 kg = 12.500 g. Si varios platos usan el mismo
 * ingrediente se suman en un solo total ANTES de aplicar el margen y redondear (si no, se compraría de más).
 *
 * Todo se calcula con ENTEROS (en miligramos), no con decimales de JavaScript: 100 asistentes × 200 g × 1,10 da
 * 22.000 g exactos = 22 kilos, mientras que con decimales saldría 22000,000000000004 y el techo lo subiría a 23.
 * Las unidades y su equivalencia en gramos son las de las recetas (config/reglasReceta.js).
 */
const { UNIDADES } = require('./reglasReceta');

const MARGEN_PORCENTAJE = 10; // RN-09

const MG_POR_G = 1000;
const divisionHaciaArriba = (numerador, denominador) => Math.floor((numerador + denominador - 1) / denominador);

/**
 * @param {number} asistentes  personas del evento (entero positivo; un decimal se sube al siguiente entero)
 * @param {Array} lineas       ingredientes de las recetas de los platos del evento, uno por plato e ingrediente:
 *                             { plato, ingrediente_id, ingrediente, cantidad_porcion, unidad_porcion, unidad_compra }
 * @returns {Array} un elemento por ingrediente, ordenado por nombre
 */
const calcularCompras = (asistentes, lineas) => {
  const n = Math.ceil(Number(asistentes));
  if (!Number.isFinite(n) || n <= 0 || !Array.isArray(lineas)) return [];

  const porIngrediente = new Map();
  for (const l of lineas) {
    const unidadPorcion = UNIDADES[l.unidad_porcion];
    const unidadCompra = UNIDADES[l.unidad_compra];
    if (!unidadPorcion || !unidadCompra) continue; // unidad desconocida: no se inventa un cálculo

    // La porción se guarda con 3 decimales: en milésimas de unidad es un entero (80 g → 80.000)
    const milesimas = Math.round(Number(l.cantidad_porcion) * 1000);
    if (!Number.isFinite(milesimas) || milesimas <= 0) continue;
    const miligramos = n * milesimas * unidadPorcion.gramos; // gramos × 1.000 por ser milésimas de unidad

    const actual = porIngrediente.get(l.ingrediente_id) || {
      ingrediente_id: l.ingrediente_id, ingrediente: l.ingrediente, unidad_compra: l.unidad_compra, miligramos: 0, platos: []
    };
    actual.miligramos += miligramos;
    if (l.plato && !actual.platos.includes(l.plato)) actual.platos.push(l.plato);
    porIngrediente.set(l.ingrediente_id, actual);
  }

  return [...porIngrediente.values()]
    .map((i) => {
      const gramosCompra = UNIDADES[i.unidad_compra].gramos;
      const conMargen = i.miligramos * (100 + MARGEN_PORCENTAJE); // miligramos × 100
      const divisor = 100 * MG_POR_G * gramosCompra;
      return {
        ingrediente_id: i.ingrediente_id,
        ingrediente: i.ingrediente,
        cantidad_a_comprar: divisionHaciaArriba(conMargen, divisor),
        unidad_compra: i.unidad_compra,
        cantidad_exacta: Number((conMargen / divisor).toFixed(4)),
        gramos_base: Number((i.miligramos / MG_POR_G).toFixed(3)),
        gramos_con_margen: Number((conMargen / (100 * MG_POR_G)).toFixed(3)),
        platos: i.platos
      };
    })
    .sort((a, b) => a.ingrediente.localeCompare(b.ingrediente, 'es'));
};

module.exports = { MARGEN_PORCENTAJE, calcularCompras };
