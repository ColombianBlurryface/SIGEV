/**
 * Ingredientes a comprar de un evento (HU-47 · RF-55). El cálculo está en config/reglasCompras.js; aquí solo se
 * juntan las recetas de los platos del evento.
 *
 *   El detalle de un evento (GET /api/eventos/:id) trae el bloque `compras_ingredientes`, calculado al consultar.
 *   POST /api/eventos/calcular-compras  { asistentes, productos: [ids de platos] }  → el mismo cálculo ANTES de guardar
 *                                       el evento (lo usa el resumen del registro).
 */
const pool = require('../config/db');
const { calcularCompras, MARGEN_PORCENTAJE } = require('../config/reglasCompras');

const MIN_ASISTENTES = 40; // RN-01, igual que el registro de eventos
const MAX_ASISTENTES = 600;
const MAX_PLATOS = 100;

/**
 * Arma el resultado para unos platos (ids del catálogo) y unos asistentes. Un plato sin receta no aporta ingredientes
 * y se avisa aparte para que no se crea que «no hay que comprar nada».
 */
const armarCompras = async (cliente, asistentes, platoIds) => {
  const base = { margen_porcentaje: MARGEN_PORCENTAJE, asistentes, items: [], platos_con_receta: 0, platos_sin_receta: [] };
  if (platoIds.length === 0) return base;

  const { rows } = await cliente.query(
    `SELECT p.id AS plato_id, p.nombre AS plato, i.id AS ingrediente_id, i.nombre AS ingrediente,
            pi.cantidad_porcion, pi.unidad_porcion, i.unidad_compra
     FROM catalogo_productos p
     LEFT JOIN plato_ingredientes pi ON pi.plato_id = p.id
     LEFT JOIN ingredientes i ON i.id = pi.ingrediente_id
     WHERE p.id = ANY($1::int[]) AND p.clasificacion = 'alimento' AND p.categoria_inventario IS NULL
     ORDER BY p.nombre, pi.id`,
    [platoIds]
  );

  const platos = new Map();
  const lineas = [];
  for (const r of rows) {
    platos.set(r.plato_id, { producto_id: r.plato_id, nombre: r.plato, conReceta: platos.get(r.plato_id)?.conReceta || r.ingrediente_id !== null });
    if (r.ingrediente_id !== null) lineas.push({ ...r, cantidad_porcion: Number(r.cantidad_porcion) });
  }
  return {
    ...base,
    items: calcularCompras(asistentes, lineas),
    platos_con_receta: [...platos.values()].filter((p) => p.conReceta).length,
    platos_sin_receta: [...platos.values()].filter((p) => !p.conReceta).map(({ producto_id, nombre }) => ({ producto_id, nombre }))
  };
};

// Para el detalle: los platos (alimentos) que el evento ya tiene guardados
const comprasDeEvento = async (cliente, eventoId, asistentes) => {
  const { rows } = await cliente.query(
    `SELECT ep.producto_id FROM evento_productos ep JOIN catalogo_productos cp ON cp.id = ep.producto_id
     WHERE ep.evento_id = $1 AND cp.clasificacion = 'alimento' AND cp.categoria_inventario IS NULL`,
    [eventoId]
  );
  return armarCompras(cliente, asistentes, rows.map((r) => r.producto_id));
};

const datosInvalidos = (res, detalle) => res.status(400).json({ error: 'Datos inválidos', detalle });

// POST /api/eventos/calcular-compras
const calcularComprasPrevio = async (req, res) => {
  const { asistentes, productos } = req.body && typeof req.body === 'object' ? req.body : {};
  if (!Number.isInteger(asistentes) || asistentes < MIN_ASISTENTES || asistentes > MAX_ASISTENTES) {
    return datosInvalidos(res, `Los asistentes deben ser un número entero de ${MIN_ASISTENTES} a ${MAX_ASISTENTES}.`);
  }
  if (!Array.isArray(productos) || productos.length > MAX_PLATOS) {
    return datosInvalidos(res, `productos debe ser una lista de máximo ${MAX_PLATOS} platos.`);
  }
  if (!productos.every((id) => Number.isInteger(id) && id >= 1 && id <= 2147483647)) {
    return datosInvalidos(res, 'Cada plato debe indicarse con su id (un número entero positivo).');
  }
  const ids = [...new Set(productos)];
  try {
    if (ids.length > 0) {
      const { rows } = await pool.query(
        `SELECT id FROM catalogo_productos WHERE id = ANY($1::int[]) AND clasificacion = 'alimento' AND categoria_inventario IS NULL`,
        [ids]
      );
      const existentes = new Set(rows.map((r) => r.id));
      const faltan = ids.filter((id) => !existentes.has(id));
      if (faltan.length > 0) return datosInvalidos(res, `Estos ids no son platos (alimentos) del catálogo: ${faltan.join(', ')}.`);
    }
    res.json(await armarCompras(pool, asistentes, ids));
  } catch (error) {
    console.error('Error al calcular los ingredientes a comprar (HU-47):', error);
    res.status(500).json({ error: 'Error al calcular los ingredientes a comprar' });
  }
};

module.exports = { armarCompras, comprasDeEvento, calcularComprasPrevio };
