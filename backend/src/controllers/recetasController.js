/**
 * Controlador de las recetas de los platos (HU-46 · RF-54).
 *
 * Un plato es un alimento del catálogo. Su receta lista los ingredientes con la cantidad que consume una persona
 * y la unidad; cada ingrediente (tabla `ingredientes`, el maestro) sabe cómo se compra: kilo, libra o arroba.
 * Las reglas de unidades y cantidades están en config/reglasReceta.js.
 *
 *   GET /api/catalogo/recetas          resumen: cuántos ingredientes tiene la receta de cada plato
 *   GET /api/catalogo/ingredientes     el maestro de ingredientes (para sugerir nombres al escribir)
 *   GET /api/catalogo/:id/receta       la receta de un plato
 *   PUT /api/catalogo/:id/receta       registra o reemplaza la receta completa de un plato
 */
const pool = require('../config/db');
const { validarReceta, claveNombre, UNIDADES } = require('../config/reglasReceta');

const datosInvalidos = (res, detalle) => res.status(400).json({ error: 'Datos inválidos', detalle });

// Un plato es un alimento del catálogo (no del inventario). Devuelve { plato } o { estado, error } para responder.
const buscarPlato = async (cliente, id, bloquear = false) => {
  if (!/^\d+$/.test(String(id)) || Number(id) < 1 || Number(id) > 2147483647) {
    return { estado: 400, error: 'Datos inválidos', detalle: 'El id del plato debe ser un número entero positivo.' };
  }
  const { rows } = await cliente.query(
    `SELECT id, nombre, clasificacion, activo FROM catalogo_productos
     WHERE id = $1 AND categoria_inventario IS NULL ${bloquear ? 'FOR UPDATE' : ''}`,
    [Number(id)]
  );
  if (rows.length === 0) return { estado: 404, error: 'Plato no encontrado', detalle: 'No existe un plato del catálogo con ese id.' };
  if (rows[0].clasificacion !== 'alimento') {
    return { estado: 400, error: 'Datos inválidos', detalle: 'Solo los alimentos (platos) tienen receta; una bebida no.' };
  }
  return { plato: rows[0] };
};

// La respuesta de GET y PUT: el plato y su receta, en el orden en que se registró
const armarRespuesta = async (cliente, plato) => {
  const { rows } = await cliente.query(
    `SELECT pi.ingrediente_id, i.nombre AS ingrediente, pi.cantidad_porcion, pi.unidad_porcion,
            i.unidad_compra, pi.es_dato_prueba
     FROM plato_ingredientes pi JOIN ingredientes i ON i.id = pi.ingrediente_id
     WHERE pi.plato_id = $1 ORDER BY pi.id`,
    [plato.id]
  );
  const receta = rows.map((r) => ({ ...r, cantidad_porcion: Number(r.cantidad_porcion) }));
  return {
    plato_id: plato.id,
    plato: plato.nombre,
    // Los datos de ejemplo se marcan hasta que alguien guarda la receta real (ahí dejan de serlo)
    es_dato_prueba: receta.length > 0 && receta.every((r) => r.es_dato_prueba),
    receta
  };
};

const obtenerReceta = async (req, res) => {
  try {
    const r = await buscarPlato(pool, req.params.id);
    if (r.error) return res.status(r.estado).json({ error: r.error, detalle: r.detalle });
    res.json(await armarRespuesta(pool, r.plato));
  } catch (error) {
    console.error('Error al consultar la receta de un plato (HU-46):', error);
    res.status(500).json({ error: 'Error al consultar la receta del plato' });
  }
};

const listarResumenRecetas = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id AS plato_id, p.nombre AS plato, p.activo,
              COUNT(pi.id)::int AS ingredientes,
              COALESCE(BOOL_AND(pi.es_dato_prueba) FILTER (WHERE pi.id IS NOT NULL), false) AS es_dato_prueba
       FROM catalogo_productos p LEFT JOIN plato_ingredientes pi ON pi.plato_id = p.id
       WHERE p.categoria_inventario IS NULL AND p.clasificacion = 'alimento'
       GROUP BY p.id ORDER BY p.nombre`
    );
    res.json(rows);
  } catch (error) {
    console.error('Error al listar las recetas (HU-46):', error);
    res.status(500).json({ error: 'Error al consultar las recetas' });
  }
};

const listarIngredientes = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.id, i.nombre, i.unidad_compra, COUNT(pi.id)::int AS platos
       FROM ingredientes i LEFT JOIN plato_ingredientes pi ON pi.ingrediente_id = i.id
       GROUP BY i.id ORDER BY i.nombre`
    );
    res.json(rows);
  } catch (error) {
    console.error('Error al listar los ingredientes (HU-46):', error);
    res.status(500).json({ error: 'Error al consultar los ingredientes' });
  }
};

/**
 * Registra o reemplaza la receta completa de un plato, todo en una transacción (o se guarda entera o no se guarda).
 * Los ingredientes que no existen en el maestro se crean al vuelo. La unidad de compra es del ingrediente y la
 * comparten todas las recetas: si otra receta ya lo compra de otra forma se responde 409; si solo lo usa esta
 * receta, se puede corregir.
 */
const guardarReceta = async (req, res) => {
  const validacion = validarReceta(req.body);
  if (validacion.error) return datosInvalidos(res, validacion.error);

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const r = await buscarPlato(cliente, req.params.id, true); // bloquea el plato: dos guardados a la vez se turnan
    if (r.error) {
      await cliente.query('ROLLBACK');
      return res.status(r.estado).json({ error: r.error, detalle: r.detalle });
    }

    const { rows: existentes } = await cliente.query('SELECT id, nombre, unidad_compra FROM ingredientes');
    const porClave = new Map(existentes.map((e) => [claveNombre(e.nombre), e]));

    const conflicto = async (maestro, linea) => {
      const { rows } = await cliente.query(
        'SELECT COUNT(*)::int AS otras FROM plato_ingredientes WHERE ingrediente_id = $1 AND plato_id <> $2',
        [maestro.id, r.plato.id]
      );
      if (rows[0].otras > 0) {
        await cliente.query('ROLLBACK');
        res.status(409).json({
          error: 'Unidad de compra en conflicto',
          detalle: `«${maestro.nombre}» ya se compra por ${UNIDADES[maestro.unidad_compra].etiqueta} en ${rows[0].otras === 1 ? 'otra receta' : `${rows[0].otras} recetas más`}; no se puede registrar por ${UNIDADES[linea.unidad_compra].etiqueta}. Usa la misma unidad de compra.`
        });
        return true;
      }
      await cliente.query('UPDATE ingredientes SET unidad_compra = $1 WHERE id = $2', [linea.unidad_compra, maestro.id]);
      return false;
    };

    const ids = [];
    for (const linea of validacion.ingredientes) {
      let maestro = porClave.get(linea.clave);
      if (!maestro) {
        const { rows } = await cliente.query(
          `INSERT INTO ingredientes (nombre, unidad_compra) VALUES ($1, $2)
           ON CONFLICT (lower(nombre)) DO NOTHING RETURNING id, nombre, unidad_compra`,
          [linea.nombre, linea.unidad_compra]
        );
        // Si otra petición lo creó justo ahora, se vuelve a leer
        maestro = rows[0] || (await cliente.query('SELECT id, nombre, unidad_compra FROM ingredientes WHERE lower(nombre) = lower($1)', [linea.nombre])).rows[0];
      }
      if (maestro.unidad_compra !== linea.unidad_compra && (await conflicto(maestro, linea))) return;
      ids.push(maestro.id);
    }

    await cliente.query('DELETE FROM plato_ingredientes WHERE plato_id = $1', [r.plato.id]);
    for (const [i, linea] of validacion.ingredientes.entries()) {
      await cliente.query(
        `INSERT INTO plato_ingredientes (plato_id, ingrediente_id, cantidad_porcion, unidad_porcion) VALUES ($1, $2, $3, $4)`,
        [r.plato.id, ids[i], linea.cantidad_porcion, linea.unidad_porcion]
      );
    }
    const respuesta = await armarRespuesta(cliente, r.plato);
    await cliente.query('COMMIT');
    res.json(respuesta);
  } catch (error) {
    await cliente.query('ROLLBACK').catch(() => {});
    console.error('Error al guardar la receta de un plato (HU-46):', error);
    res.status(500).json({ error: 'Error al guardar la receta del plato' });
  } finally {
    cliente.release();
  }
};

module.exports = { obtenerReceta, guardarReceta, listarResumenRecetas, listarIngredientes };
