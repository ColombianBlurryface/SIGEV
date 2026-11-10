/**
 * Botellas de licor a comprar para coctelería de un evento (HU-45 · RF-53, RN-09, RN-15, RN-19).
 *
 * El detalle de un evento (GET /api/eventos/:id) trae el bloque `compras_cocteles`, calculado al consultar.
 * POST /api/eventos/calcular-compras-cocteles { asistentes, productos: [{ producto_id, porcion_por_persona }] }
 *   -> el mismo cálculo ANTES de guardar el evento (usado en PestanaBebidas y en PasoResumen).
 */
const pool = require('../config/db');

const MARGEN_PORCENTAJE = 10;
const MIN_ASISTENTES = 40;
const MAX_ASISTENTES = 600;
const MAX_COCTELES = 50;

const redondearArriba = (valor) => Math.ceil(Number(valor.toFixed(6)));

/**
 * Arma el cálculo consolidado de botellas para una lista de productos de coctelería y un número de asistentes.
 *
 * @param {import('pg').Pool | import('pg').PoolClient} cliente
 * @param {number} asistentes
 * @param {Array<{ producto_id?: number, coctel_id?: number, nombre?: string, porcion_por_persona?: number }>} items
 */
const armarComprasCocteles = async (cliente, asistentes, items) => {
  const base = {
    margen_porcentaje: MARGEN_PORCENTAJE,
    asistentes,
    items: [],
    total_botellas: 0,
    costo_total_licores: 0,
    cocteles_con_receta: 0,
    cocteles_sin_receta: [],
  };

  if (!items || items.length === 0) return base;

  // Extraer IDs de catalogo_productos o coctel_id
  const productoIds = items.map((i) => i.producto_id).filter((id) => Number.isInteger(id) && id > 0);
  const coctelIds = items.map((i) => i.coctel_id).filter((id) => Number.isInteger(id) && id > 0);

  let coctelesMapeados = [];

  if (productoIds.length > 0) {
    const { rows } = await cliente.query(
      `SELECT cp.id AS producto_id, cp.nombre AS producto_nombre,
              c.id AS coctel_id, c.nombre AS coctel_nombre, c.activo AS coctel_activo
       FROM catalogo_productos cp
       LEFT JOIN cocteles c ON LOWER(TRIM(c.nombre)) = LOWER(TRIM(cp.nombre)) AND c.activo = true
       WHERE cp.id = ANY($1::int[]) AND cp.clasificacion = 'bar_cocteleria'`,
      [productoIds]
    );

    for (const r of rows) {
      const itemInput = items.find((i) => i.producto_id === r.producto_id);
      const porcion = Number(itemInput?.porcion_por_persona) || 1;
      coctelesMapeados.push({
        producto_id: r.producto_id,
        nombre: r.producto_nombre,
        coctel_id: r.coctel_id || null,
        coctel_nombre: r.coctel_nombre || null,
        porcion,
      });
    }
  }

  if (coctelIds.length > 0) {
    const { rows } = await cliente.query(
      `SELECT c.id AS coctel_id, c.nombre AS coctel_nombre
       FROM cocteles c
       WHERE c.id = ANY($1::int[]) AND c.activo = true`,
      [coctelIds]
    );

    for (const r of rows) {
      const itemInput = items.find((i) => i.coctel_id === r.coctel_id);
      const porcion = Number(itemInput?.porcion_por_persona) || 1;
      if (!coctelesMapeados.some((m) => m.coctel_id === r.coctel_id)) {
        coctelesMapeados.push({
          producto_id: null,
          nombre: r.coctel_nombre,
          coctel_id: r.coctel_id,
          coctel_nombre: r.coctel_nombre,
          porcion,
        });
      }
    }
  }

  // Identificar cócteles con y sin receta
  const conReceta = coctelesMapeados.filter((c) => c.coctel_id !== null);
  const sinReceta = coctelesMapeados.filter((c) => c.coctel_id === null);

  if (conReceta.length === 0) {
    return {
      ...base,
      cocteles_con_receta: 0,
      cocteles_sin_receta: sinReceta.map((s) => ({ producto_id: s.producto_id, nombre: s.nombre })),
    };
  }

  const idsConReceta = conReceta.map((c) => c.coctel_id);
  const { rows: ingredientes } = await cliente.query(
    `SELECT ci.coctel_id, ci.licor_id, ci.mililitros,
            p.nombre AS nombre_licor, p.volumen_botella_ml, p.precio_unitario
     FROM coctel_ingredientes ci
     JOIN catalogo_productos p ON ci.licor_id = p.id
     WHERE ci.coctel_id = ANY($1::int[])
     ORDER BY p.nombre, ci.id`,
    [idsConReceta]
  );

  // Consolidar licores
  const consolidado = {};
  for (const c of conReceta) {
    const ingCoctel = ingredientes.filter((i) => i.coctel_id === c.coctel_id);
    if (ingCoctel.length === 0) {
      // Si el cóctel existe pero no tiene ingredientes configurados, tratarlo como sin receta
      sinReceta.push(c);
      continue;
    }

    const porPersona = Math.max(1, Math.min(10, Math.round(c.porcion || 1)));
    for (const ing of ingCoctel) {
      const mlTrago = parseFloat(ing.mililitros) || 0;
      const mlNetosCoctel = asistentes * porPersona * mlTrago;

      if (!consolidado[ing.licor_id]) {
        consolidado[ing.licor_id] = {
          licor_id: ing.licor_id,
          nombre_licor: ing.nombre_licor,
          volumen_botella_ml: parseFloat(ing.volumen_botella_ml) > 0 ? parseFloat(ing.volumen_botella_ml) : 750,
          precio_unitario: parseFloat(ing.precio_unitario) || 0,
          ml_netos: 0,
          cocteles: [],
        };
      }

      consolidado[ing.licor_id].ml_netos += mlNetosCoctel;
      if (!consolidado[ing.licor_id].cocteles.includes(c.nombre)) {
        consolidado[ing.licor_id].cocteles.push(c.nombre);
      }
    }
  }

  const margenSeguridad = 1 + MARGEN_PORCENTAJE / 100;
  const itemsCalculados = Object.values(consolidado).map((item) => {
    const mlConMargen = item.ml_netos * margenSeguridad;
    const botellas = redondearArriba(mlConMargen / item.volumen_botella_ml);
    const costoEstimado = botellas * item.precio_unitario;

    return {
      licor_id: item.licor_id,
      nombre_licor: item.nombre_licor,
      volumen_botella_ml: item.volumen_botella_ml,
      precio_unitario: item.precio_unitario,
      ml_netos: Math.round(item.ml_netos),
      ml_con_margen: Math.round(mlConMargen),
      botellas_requeridas: botellas,
      costo_estimado: costoEstimado,
      cocteles: item.cocteles,
    };
  });

  const totalBotellas = itemsCalculados.reduce((acc, curr) => acc + curr.botellas_requeridas, 0);
  const costoTotalLicores = itemsCalculados.reduce((acc, curr) => acc + curr.costo_estimado, 0);

  return {
    margen_porcentaje: MARGEN_PORCENTAJE,
    asistentes,
    items: itemsCalculados,
    total_botellas: totalBotellas,
    costo_total_licores: costoTotalLicores,
    cocteles_con_receta: conReceta.filter((c) => !sinReceta.includes(c)).length,
    cocteles_sin_receta: sinReceta.map((s) => ({ producto_id: s.producto_id, nombre: s.nombre })),
  };
};

/**
 * Consulta y calcula los licores requeridos para un evento guardado.
 */
const comprasCoctelesDeEvento = async (cliente, eventoId, asistentes) => {
  const { rows } = await cliente.query(
    `SELECT ep.producto_id, ep.porcion_por_persona
     FROM evento_productos ep
     JOIN catalogo_productos cp ON cp.id = ep.producto_id
     WHERE ep.evento_id = $1 AND cp.clasificacion = 'bar_cocteleria'`,
    [eventoId]
  );

  return armarComprasCocteles(cliente, asistentes, rows.map((r) => ({
    producto_id: r.producto_id,
    porcion_por_persona: Number(r.porcion_por_persona) || 1,
  })));
};

const datosInvalidos = (res, detalle) => res.status(400).json({ error: 'Datos inválidos', detalle });

/**
 * POST /api/eventos/calcular-compras-cocteles
 * Calcula en tiempo real las botellas de licor requeridas antes de guardar el evento.
 */
const calcularComprasCoctelesPrevio = async (req, res) => {
  const { asistentes, productos } = req.body && typeof req.body === 'object' ? req.body : {};

  if (!Number.isInteger(asistentes) || asistentes < MIN_ASISTENTES || asistentes > MAX_ASISTENTES) {
    return datosInvalidos(res, `Los asistentes deben ser un número entero de ${MIN_ASISTENTES} a ${MAX_ASISTENTES}.`);
  }

  if (!Array.isArray(productos) || productos.length > MAX_COCTELES) {
    return datosInvalidos(res, `productos debe ser una lista de máximo ${MAX_COCTELES} cócteles.`);
  }

  // Normalizar items: acepta `{ producto_id, porcion_por_persona }` o `{ coctel_id, porcion_por_persona }` o un simple ID
  const itemsNormalizados = [];
  for (const p of productos) {
    if (typeof p === 'number' && Number.isInteger(p) && p > 0) {
      itemsNormalizados.push({ producto_id: p, porcion_por_persona: 1 });
    } else if (p && typeof p === 'object') {
      const pid = Number(p.producto_id);
      const cid = Number(p.coctel_id);
      const porcion = Number(p.porcion_por_persona ?? p.porcion ?? 1);
      if ((Number.isInteger(pid) && pid > 0) || (Number.isInteger(cid) && cid > 0)) {
        itemsNormalizados.push({
          producto_id: Number.isInteger(pid) && pid > 0 ? pid : undefined,
          coctel_id: Number.isInteger(cid) && cid > 0 ? cid : undefined,
          porcion_por_persona: porcion,
        });
      }
    }
  }

  try {
    const resultado = await armarComprasCocteles(pool, asistentes, itemsNormalizados);
    res.json(resultado);
  } catch (error) {
    console.error('Error al calcular botellas de coctelería (HU-45):', error);
    res.status(500).json({ error: 'Error al calcular las botellas de licor a comprar', detalle: error.message });
  }
};

module.exports = {
  armarComprasCocteles,
  comprasCoctelesDeEvento,
  calcularComprasCoctelesPrevio,
};
