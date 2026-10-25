/**
 * Controlador para la gestión de recetas de cócteles (HU-44, RF-52)
 * y cálculo de botellas para eventos (HU-45, RF-53, RN-09, RN-15, RN-19).
 */
const pool = require('../config/db');

const MAX_LICORES_POR_RECETA = 6;
const ML_MAX_POR_LICOR = 250;

// Redondea hacia arriba evitando errores de precisión decimal flotante de JS (RN-11)
const redondearArriba = (valor) => Math.ceil(Number(valor.toFixed(6)));

// GET /api/cocteles - Listar todos los cócteles activos con su receta completa
const listarCocteles = async (req, res) => {
  try {
    const { rows: cocteles } = await pool.query(
      `SELECT id, nombre, descripcion, activo 
       FROM cocteles 
       WHERE activo = true 
       ORDER BY nombre ASC`
    );

    const { rows: ingredientes } = await pool.query(
      `SELECT 
         ci.id,
         ci.coctel_id,
         ci.licor_id,
         ci.mililitros,
         p.nombre AS nombre_licor,
         p.volumen_botella_ml,
         p.precio_unitario
       FROM coctel_ingredientes ci
       JOIN catalogo_productos p ON ci.licor_id = p.id
       ORDER BY ci.id ASC`
    );

    const resultado = cocteles.map((c) => ({
      ...c,
      ingredientes: ingredientes.filter((i) => i.coctel_id === c.id),
    }));

    res.json(resultado);
  } catch (error) {
    console.error('Error al listar cócteles (HU-44):', error);
    res.status(500).json({ error: 'Error al consultar las recetas de cócteles', detalle: error.message });
  }
};

// GET /api/cocteles/:id - Obtener un cóctel puntual por ID
const obtenerCoctelPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: cocteles } = await pool.query(
      `SELECT id, nombre, descripcion, activo FROM cocteles WHERE id = $1`,
      [id]
    );

    if (cocteles.length === 0) {
      return res.status(404).json({ error: 'Cóctel no encontrado' });
    }

    const { rows: ingredientes } = await pool.query(
      `SELECT 
         ci.id,
         ci.coctel_id,
         ci.licor_id,
         ci.mililitros,
         p.nombre AS nombre_licor,
         p.volumen_botella_ml,
         p.precio_unitario
       FROM coctel_ingredientes ci
       JOIN catalogo_productos p ON ci.licor_id = p.id
       WHERE ci.coctel_id = $1
       ORDER BY ci.id ASC`,
      [id]
    );

    res.json({
      ...cocteles[0],
      ingredientes,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar el cóctel', detalle: error.message });
  }
};

// POST /api/cocteles - Crear cóctel con su receta
const crearCoctel = async (req, res) => {
  const { nombre, descripcion, ingredientes } = req.body;

  if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
    return res.status(400).json({ error: 'Datos inválidos', detalle: 'El nombre del cóctel es obligatorio.' });
  }

  if (!Array.isArray(ingredientes) || ingredientes.length === 0) {
    return res.status(400).json({ error: 'Datos inválidos', detalle: 'Debe incluir al menos un licor en la receta.' });
  }

  if (ingredientes.length > MAX_LICORES_POR_RECETA) {
    return res.status(400).json({
      error: 'Datos inválidos',
      detalle: `Una receta no puede tener más de ${MAX_LICORES_POR_RECETA} licores.`,
    });
  }

  for (const ing of ingredientes) {
    const ml = parseFloat(ing.mililitros);
    if (!ing.licor_id || isNaN(ml) || ml <= 0 || ml > ML_MAX_POR_LICOR) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalle: `Los mililitros deben ser un número mayor a 0 y máximo ${ML_MAX_POR_LICOR} ml por licor.`,
      });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const licorIds = ingredientes.map((i) => i.licor_id);
    const { rows: licoresValidos } = await client.query(
      `SELECT id FROM catalogo_productos 
       WHERE id = ANY($1::int[]) 
         AND clasificacion = 'bar_cocteleria' 
         AND categoria_inventario IS NULL 
         AND activo = true`,
      [licorIds]
    );

    if (licoresValidos.length !== licorIds.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Datos inválidos',
        detalle: 'Todos los licores deben ser bebidas de coctelería activas del catálogo.',
      });
    }

    const { rows: nuevoCoctel } = await client.query(
      `INSERT INTO cocteles (nombre, descripcion) VALUES ($1, $2) RETURNING id, nombre, descripcion`,
      [nombre.trim(), descripcion ? descripcion.trim() : null]
    );

    const coctelId = nuevoCoctel[0].id;

    for (const ing of ingredientes) {
      await client.query(
        `INSERT INTO coctel_ingredientes (coctel_id, licor_id, mililitros) VALUES ($1, $2, $3)`,
        [coctelId, ing.licor_id, parseFloat(ing.mililitros)]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({
      id: coctelId,
      nombre: nombre.trim(),
      descripcion: descripcion || null,
      ingredientes,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Conflicto', detalle: 'Ya existe un cóctel registrado con ese nombre.' });
    }
    res.status(500).json({ error: 'Error al registrar el cóctel', detalle: error.message });
  } finally {
    client.release();
  }
};

// PUT /api/cocteles/:id - Editar receta de cóctel
const editarCoctel = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, ingredientes } = req.body;

  if (!nombre || !Array.isArray(ingredientes) || ingredientes.length === 0) {
    return res.status(400).json({ error: 'Datos inválidos', detalle: 'Nombre e ingredientes requeridos.' });
  }

  if (ingredientes.length > MAX_LICORES_POR_RECETA) {
    return res.status(400).json({
      error: 'Datos inválidos',
      detalle: `Una receta no puede tener más de ${MAX_LICORES_POR_RECETA} licores.`,
    });
  }

  for (const ing of ingredientes) {
    const ml = parseFloat(ing.mililitros);
    if (!ing.licor_id || isNaN(ml) || ml <= 0 || ml > ML_MAX_POR_LICOR) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalle: `Los mililitros deben ser un número mayor a 0 y máximo ${ML_MAX_POR_LICOR} ml por licor.`,
      });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rowCount } = await client.query(
      `UPDATE cocteles SET nombre = $1, descripcion = $2, actualizado_en = NOW() WHERE id = $3`,
      [nombre.trim(), descripcion ? descripcion.trim() : null, id]
    );

    if (rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cóctel no encontrado' });
    }

    await client.query(`DELETE FROM coctel_ingredientes WHERE coctel_id = $1`, [id]);

    for (const ing of ingredientes) {
      await client.query(
        `INSERT INTO coctel_ingredientes (coctel_id, licor_id, mililitros) VALUES ($1, $2, $3)`,
        [id, ing.licor_id, parseFloat(ing.mililitros)]
      );
    }

    await client.query('COMMIT');
    res.json({ mensaje: 'Receta de cóctel actualizada exitosamente.' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error al actualizar el cóctel', detalle: error.message });
  } finally {
    client.release();
  }
};

// DELETE /api/cocteles/:id - Eliminar cóctel
const eliminarCoctel = async (req, res) => {
  const { id } = req.params;

  try {
    const { rowCount } = await pool.query(`DELETE FROM cocteles WHERE id = $1 RETURNING id`, [id]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Cóctel no encontrado' });
    }

    res.json({ mensaje: 'Cóctel eliminado exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar cóctel:', error);
    res.status(500).json({ error: 'Error al eliminar el cóctel', detalle: error.message });
  }
};

/**
 * HU-45 (RF-53, RN-19, RN-09, RN-15):
 * Función pura para calcular botellas requeridas por licor con consolidación.
 */
function procesarCalculoBotellas(asistentes, coctelesConReceta) {
  const MARGEN_SEGURIDAD = 1.10; // RN-09: 10% margen de seguridad
  const consolidadoLicores = {}; // licor_id -> { nombre, ml_netos, volumen_botella_ml, precio_unitario }

  coctelesConReceta.forEach((c) => {
    const porPersona = parseInt(c.cocteles_por_persona, 10) || 1;
    (c.ingredientes || []).forEach((ing) => {
      const mlTrago = parseFloat(ing.mililitros) || 0;
      const mlNetosCoctel = asistentes * porPersona * mlTrago;

      if (!consolidadoLicores[ing.licor_id]) {
        consolidadoLicores[ing.licor_id] = {
          licor_id: ing.licor_id,
          nombre_licor: ing.nombre_licor,
          ml_netos: 0,
          volumen_botella_ml: parseFloat(ing.volumen_botella_ml) || 750,
          precio_unitario: parseFloat(ing.precio_unitario) || 0,
        };
      }
      consolidadoLicores[ing.licor_id].ml_netos += mlNetosCoctel;
    });
  });

  // Aplicar margen del 10% y redondeo superior (RN-11, RN-19)
  return Object.values(consolidadoLicores).map((item) => {
    const mlConMargen = item.ml_netos * MARGEN_SEGURIDAD;
    const botellas = redondearArriba(mlConMargen / item.volumen_botella_ml);
    const costoEstimado = botellas * item.precio_unitario;

    return {
      licor_id: item.licor_id,
      nombre_licor: item.nombre_licor,
      ml_netos: Math.round(item.ml_netos),
      ml_con_margen: Math.round(mlConMargen),
      volumen_botella_ml: item.volumen_botella_ml,
      botellas_requeridas: botellas,
      precio_unitario: item.precio_unitario,
      costo_estimado: costoEstimado,
    };
  });
}

/**
 * POST /api/cocteles/calcular
 * HU-45: Calcula botellas sin necesidad de guardar en BD.
 */
const calcularCocteleriaEvento = async (req, res) => {
  const { asistentes, cocteles } = req.body;
  const numAsistentes = parseInt(asistentes, 10);

  if (!numAsistentes || numAsistentes < 40 || numAsistentes > 600) {
    return res.status(400).json({ error: 'La cantidad de asistentes debe estar entre 40 y 600.' });
  }

  if (!Array.isArray(cocteles) || cocteles.length === 0) {
    return res.json({ licores_calculados: [], total_botellas: 0, costo_total_licores: 0 });
  }

  // Validar RN-15: enteros de 1 a 10
  for (const c of cocteles) {
    const cant = parseInt(c.cocteles_por_persona, 10);
    if (isNaN(cant) || cant < 1 || cant > 10) {
      return res.status(400).json({ error: 'Los cócteles por persona deben ser un número entero entre 1 y 10.' });
    }
  }

  try {
    const ids = cocteles.map((c) => c.coctel_id);

    // Consulta de recetas limpias
    const { rows: ingredientes } = await pool.query(
      `SELECT 
         ci.coctel_id,
         ci.licor_id,
         ci.mililitros,
         p.nombre AS nombre_licor,
         p.volumen_botella_ml,
         p.precio_unitario
       FROM coctel_ingredientes ci
       JOIN catalogo_productos p ON ci.licor_id = p.id
       WHERE ci.coctel_id = ANY($1::int[])`,
      [ids]
    );

    const coctelesConReceta = cocteles.map((c) => ({
      ...c,
      ingredientes: ingredientes.filter((i) => i.coctel_id === c.coctel_id),
    }));

    const licoresCalculados = procesarCalculoBotellas(numAsistentes, coctelesConReceta);
    const totalBotellas = licoresCalculados.reduce((acc, curr) => acc + curr.botellas_requeridas, 0);
    const costoTotalLicores = licoresCalculados.reduce((acc, curr) => acc + curr.costo_estimado, 0);

    res.json({
      asistentes: numAsistentes,
      cocteles_seleccionados: coctelesConReceta,
      licores_calculados: licoresCalculados,
      total_botellas: totalBotellas,
      costo_total_licores: costoTotalLicores,
    });
  } catch (error) {
    console.error('Error al calcular cócteles (HU-45):', error);
    res.status(500).json({ error: 'Error al calcular el licor de los cócteles', detalle: error.message });
  }
};

// EXPORTACIÓN COMPLETA (incluye calcularCocteleriaEvento)
module.exports = {
  listarCocteles,
  obtenerCoctelPorId,
  crearCoctel,
  editarCoctel,
  eliminarCoctel,
  calcularCocteleriaEvento,
};