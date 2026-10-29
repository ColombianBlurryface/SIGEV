/**
 * Controlador para la gestión de recetas de cócteles (HU-44, RF-52)
 * y cálculo de botellas para eventos (HU-45, RF-53, RN-09, RN-15, RN-19).
 */
const pool = require('../config/db');

const { validarCoctel, validarCalculo, idDeRuta } = require('../config/reglasCoctel');

const idInvalido = (res) => res.status(400).json({ error: 'Datos inválidos', detalle: 'El id del cóctel debe ser un número entero positivo.' });

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
    const id = idDeRuta(req.params.id);
    if (id === null) return idInvalido(res);
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
  const datos = validarCoctel(req.body);
  if (datos.error) return res.status(400).json({ error: 'Datos inválidos', detalle: datos.error });
  const { nombre, descripcion, ingredientes } = datos;

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
      [nombre, descripcion]
    );

    const coctelId = nuevoCoctel[0].id;

    for (const ing of ingredientes) {
      await client.query(
        `INSERT INTO coctel_ingredientes (coctel_id, licor_id, mililitros) VALUES ($1, $2, $3)`,
        [coctelId, ing.licor_id, ing.mililitros]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({
      id: coctelId,
      nombre,
      descripcion,
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
  const id = idDeRuta(req.params.id);
  if (id === null) return idInvalido(res);
  const datos = validarCoctel(req.body);
  if (datos.error) return res.status(400).json({ error: 'Datos inválidos', detalle: datos.error });
  const { nombre, descripcion, ingredientes } = datos;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rowCount } = await client.query(
      `UPDATE cocteles SET nombre = $1, descripcion = $2, actualizado_en = NOW() WHERE id = $3`,
      [nombre, descripcion, id]
    );

    if (rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cóctel no encontrado' });
    }

    // Igual que al crear: todos los licores deben ser bebidas de coctelería activas del catálogo
    const licorIds = ingredientes.map((i) => i.licor_id);
    const { rows: licoresValidos } = await client.query(
      `SELECT id FROM catalogo_productos
       WHERE id = ANY($1::int[]) AND clasificacion = 'bar_cocteleria' AND categoria_inventario IS NULL AND activo = true`,
      [licorIds]
    );
    if (licoresValidos.length !== licorIds.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Datos inválidos', detalle: 'Todos los licores deben ser bebidas de coctelería activas del catálogo.' });
    }

    await client.query(`DELETE FROM coctel_ingredientes WHERE coctel_id = $1`, [id]);

    for (const ing of ingredientes) {
      await client.query(
        `INSERT INTO coctel_ingredientes (coctel_id, licor_id, mililitros) VALUES ($1, $2, $3)`,
        [id, ing.licor_id, ing.mililitros]
      );
    }

    await client.query('COMMIT');
    res.json({ mensaje: 'Receta de cóctel actualizada exitosamente.' });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Conflicto', detalle: 'Ya existe un cóctel registrado con ese nombre.' });
    }
    res.status(500).json({ error: 'Error al actualizar el cóctel', detalle: error.message });
  } finally {
    client.release();
  }
};

// DELETE /api/cocteles/:id - Eliminar cóctel
const eliminarCoctel = async (req, res) => {
  const id = idDeRuta(req.params.id);
  if (id === null) return idInvalido(res);

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
  const datos = validarCalculo(req.body);
  if (datos.error) return res.status(400).json({ error: 'Datos inválidos', detalle: datos.error });
  const { asistentes: numAsistentes, cocteles } = datos;

  if (cocteles.length === 0) {
    return res.json({ licores_calculados: [], total_botellas: 0, costo_total_licores: 0 });
  }

  try {
    const ids = cocteles.map((c) => c.coctel_id);

    const { rows: existentes } = await pool.query('SELECT id FROM cocteles WHERE id = ANY($1::int[])', [ids]);
    if (existentes.length !== ids.length) {
      const hay = new Set(existentes.map((e) => e.id));
      return res.status(400).json({ error: 'Datos inválidos', detalle: `Estos cócteles no existen: ${ids.filter((id) => !hay.has(id)).join(', ')}.` });
    }

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