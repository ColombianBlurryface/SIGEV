/**
 * Controlador para la gestión de recetas de cócteles (HU-44, RF-52).
 * Sienta las bases para el cálculo de botellas en eventos (HU-45, RN-19).
 */
const pool = require('../config/db');
const MAX_LICORES_POR_RECETA = 6;
const ML_MAX_POR_LICOR = 250;
// GET /api/cocteles - Listar todos los cócteles activos con su receta completa
const listarCocteles = async (req, res) => {
  try {
    const query = `
      SELECT 
        c.id,
        c.nombre,
        c.descripcion,
        c.activo,
        COALESCE(
          json_agg(
            json_build_object(
              'licor_id', ci.licor_id,
              'nombre_licor', p.nombre,
              'mililitros', ci.mililitros,
              'volumen_botella_ml', p.volumen_botella_ml,
              'precio_unitario', p.precio_unitario
            )
          ) FILTER (WHERE ci.id IS NOT NULL), '[]'
        ) AS ingredientes
      FROM cocteles c
      LEFT JOIN coctel_ingredientes ci ON c.id = ci.coctel_id
      LEFT JOIN catalogo_productos p ON ci.licor_id = p.id
      WHERE c.activo = true
      GROUP BY c.id
      ORDER BY c.nombre ASC;
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Error al listar cócteles (HU-44):', error);
    res.status(500).json({ error: 'Error al consultar las recetas de cócteles', detalle: error.message });
  }
};

// GET /api/cocteles/:id - Obtener un cóctel puntual por ID
const obtenerCoctelPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        c.id,
        c.nombre,
        c.descripcion,
        COALESCE(
          json_agg(
            json_build_object(
              'licor_id', ci.licor_id,
              'nombre_licor', p.nombre,
              'mililitros', ci.mililitros,
              'volumen_botella_ml', p.volumen_botella_ml,
              'precio_unitario', p.precio_unitario
            )
          ) FILTER (WHERE ci.id IS NOT NULL), '[]'
        ) AS ingredientes
      FROM cocteles c
      LEFT JOIN coctel_ingredientes ci ON c.id = ci.coctel_id
      LEFT JOIN catalogo_productos p ON ci.licor_id = p.id
      WHERE c.id = $1
      GROUP BY c.id;
    `;
    const { rows } = await pool.query(query, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Cóctel no encontrado' });
    }
    res.json(rows[0]);
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
    detalle: `Una receta no puede tener más de ${MAX_LICORES_POR_RECETA} licores.`
  });
}
  // Criterio HU-44: Validación de mililitros > 0
  for (const ing of ingredientes) {
  const ml = parseFloat(ing.mililitros);
  if (!ing.licor_id || isNaN(ml) || ml <= 0 || ml > ML_MAX_POR_LICOR) {
    return res.status(400).json({
      error: 'Datos inválidos',
      detalle: `Los mililitros deben ser un número mayor a 0 y máximo ${ML_MAX_POR_LICOR} ml por licor.`
    });
  }
}

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Criterio HU-44: El licor debe ser de categoría bar_cocteleria del catálogo
    const licorIds = ingredientes.map(i => i.licor_id);
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
        detalle: 'Todos los licores deben ser bebidas de coctelería activas del catálogo.'
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
      ingredientes
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

  for (const ing of ingredientes) {
    const ml = parseFloat(ing.mililitros);
    if (!ing.licor_id || isNaN(ml) || ml <= 0 || ml > ML_MAX_POR_LICOR) {
      return res.status(400).json({ error: 'Datos inválidos', detalle: `Los mililitros deben ser un número mayor a 0 y máximo ${ML_MAX_POR_LICOR} ml por licor.` });
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

    // Reemplazar la receta
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
const eliminarCoctel = async (req, res) => {
  const { id } = req.params;

  try {
    // Al tener ON DELETE CASCADE en coctel_ingredientes, 
    // eliminar en 'cocteles' limpia automáticamente los ingredientes asociados.
    const { rowCount } = await pool.query(
      `DELETE FROM cocteles WHERE id = $1 RETURNING id`,
      [id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Cóctel no encontrado' });
    }

    res.json({ mensaje: 'Cóctel eliminado exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar cóctel:', error);
    res.status(500).json({ error: 'Error al eliminar el cóctel', detalle: error.message });
  }
};

module.exports = {
  listarCocteles,
  obtenerCoctelPorId,
  crearCoctel,
  editarCoctel,
  eliminarCoctel
};