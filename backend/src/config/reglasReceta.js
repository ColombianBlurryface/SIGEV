/**
 * Reglas de las recetas de los platos (HU-46 · RF-54).
 *
 * Una receta es la lista de ingredientes de un plato del catálogo (un alimento), cada uno con la cantidad que
 * consume UNA persona (la porción) y su unidad. Cada ingrediente tiene además una unidad de compra: cómo se
 * compra en el mercado (kilo, libra o arroba). Más adelante, otra historia multiplicará estas porciones por los
 * asistentes para calcular las compras. La pantalla repite lo necesario en frontend/src/lib/reglasReceta.ts.
 *
 * Unidades permitidas, ÚNICAS (RF-54): gramos, kilos, libras y arrobas. Se guardan en español y en singular
 * ('gramo', 'kilo', 'libra', 'arroba'); la API también entiende los nombres de la historia (GRAM, KILO, POUND,
 * ARROBA), el plural y las abreviaturas comunes (g, kg, lb, @). Cualquier otra (litros, paquetes...) se rechaza.
 */

// Equivalencia en gramos de cada unidad. En Colombia la libra comercial es de 500 g y la arroba de 25 libras.
const UNIDADES = {
  gramo: { etiqueta: 'gramos', gramos: 1 },
  kilo: { etiqueta: 'kilos', gramos: 1000 },
  libra: { etiqueta: 'libras', gramos: 500 },
  arroba: { etiqueta: 'arrobas', gramos: 12500 }
};
const CODIGOS_UNIDAD = Object.keys(UNIDADES);

const MENSAJE_UNIDADES = 'Las unidades permitidas son solo gramos, kilos, libras o arrobas.';

const ALIAS_UNIDAD = {
  gramo: 'gramo', gramos: 'gramo', g: 'gramo', gr: 'gramo', gram: 'gramo',
  kilo: 'kilo', kilos: 'kilo', kg: 'kilo', kilogramo: 'kilo', kilogramos: 'kilo',
  libra: 'libra', libras: 'libra', lb: 'libra', lbs: 'libra', pound: 'libra',
  arroba: 'arroba', arrobas: 'arroba', '@': 'arroba'
};

const LIMITES = {
  ingredientesMax: 30,        // ingredientes por receta
  nombreMax: 100,             // caracteres del nombre de un ingrediente
  decimalesMax: 3,            // la cantidad se guarda con 3 decimales
  gramosPorPersonaMax: 1000   // un ingrediente no pasa de 1 kg por persona (igual que un alimento en el catálogo)
};

/** Texto de una unidad ('KILOS', ' lb ') → su código ('kilo', 'libra'), o null si no es una unidad permitida. */
const normalizarUnidad = (valor) => {
  if (typeof valor !== 'string') return null;
  return ALIAS_UNIDAD[valor.trim().toLowerCase()] || null;
};

/** Para comparar nombres: sin mayúsculas, sin tildes y sin espacios repetidos («Pimentón» = «pimenton»). */
const claveNombre = (nombre) =>
  String(nombre).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Gramos que equivale una cantidad en cierta unidad (80 g → 80; 2 libras → 1000). */
const aGramos = (cantidad, unidad) => Number((cantidad * UNIDADES[unidad].gramos).toFixed(6));

const tieneDecimalesValidos = (n) => Math.abs(Math.round(n * 10 ** LIMITES.decimalesMax) - n * 10 ** LIMITES.decimalesMax) < 1e-6;

const formatear = (n) => new Intl.NumberFormat('es-CO', { maximumFractionDigits: 3 }).format(n);

/**
 * Revisa el cuerpo de PUT /api/catalogo/:id/receta: { ingredientes: [{ nombre_ingrediente, unidad_compra,
 * cantidad_porcion, unidad_porcion }] }. Devuelve { error } con el motivo o { ingredientes } ya normalizados.
 */
const validarReceta = (body) => {
  const lista = body && typeof body === 'object' ? body.ingredientes : undefined;
  if (!Array.isArray(lista)) return { error: 'ingredientes debe ser una lista con los ingredientes del plato.' };
  if (lista.length === 0) return { error: 'La receta debe tener al menos un ingrediente.' };
  if (lista.length > LIMITES.ingredientesMax) return { error: `Una receta admite máximo ${LIMITES.ingredientesMax} ingredientes.` };

  const vistos = new Map(); // clave del nombre → posición, para no repetir un ingrediente en la misma receta
  const ingredientes = [];
  for (const [i, linea] of lista.entries()) {
    const n = i + 1;
    if (linea === null || typeof linea !== 'object' || Array.isArray(linea)) return { error: `El ingrediente ${n} no es válido.` };

    const nombre = typeof linea.nombre_ingrediente === 'string' ? linea.nombre_ingrediente.replace(/\s+/g, ' ').trim() : '';
    if (!nombre || nombre.length > LIMITES.nombreMax) {
      return { error: `El nombre del ingrediente ${n} es obligatorio y admite máximo ${LIMITES.nombreMax} caracteres.` };
    }
    const clave = claveNombre(nombre);
    if (vistos.has(clave)) return { error: `«${nombre}» está repetido en la receta (ingredientes ${vistos.get(clave)} y ${n}): suma las cantidades en una sola línea.` };
    vistos.set(clave, n);

    const unidadCompra = normalizarUnidad(linea.unidad_compra);
    if (!unidadCompra) return { error: `La unidad de compra de «${nombre}» no es válida. ${MENSAJE_UNIDADES}`, unidades: true };
    const unidadPorcion = normalizarUnidad(linea.unidad_porcion);
    if (!unidadPorcion) return { error: `La unidad de la porción de «${nombre}» no es válida. ${MENSAJE_UNIDADES}`, unidades: true };

    const cantidad = linea.cantidad_porcion;
    if (typeof cantidad !== 'number' || !Number.isFinite(cantidad) || cantidad <= 0) {
      return { error: `La cantidad por porción de «${nombre}» debe ser un número mayor a 0.` };
    }
    if (!tieneDecimalesValidos(cantidad)) {
      return { error: `La cantidad por porción de «${nombre}» admite máximo ${LIMITES.decimalesMax} decimales.` };
    }
    const gramos = aGramos(cantidad, unidadPorcion);
    if (gramos > LIMITES.gramosPorPersonaMax) {
      return { error: `La porción de «${nombre}» equivale a ${formatear(gramos)} g por persona; el máximo es ${formatear(LIMITES.gramosPorPersonaMax)} g (1 kg).` };
    }
    ingredientes.push({ nombre, clave, unidad_compra: unidadCompra, cantidad_porcion: cantidad, unidad_porcion: unidadPorcion });
  }
  return { ingredientes };
};

module.exports = {
  UNIDADES, CODIGOS_UNIDAD, MENSAJE_UNIDADES, LIMITES,
  normalizarUnidad, claveNombre, aGramos, validarReceta
};
