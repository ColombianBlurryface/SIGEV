/**
 * Controlador del catálogo de productos.
 *
 * El catálogo guarda los alimentos y bebidas con sus porciones y precios, que se
 * usan para calcular las cantidades de cada evento. La misma tabla también guarda
 * los elementos del inventario, por eso aquí se filtran con
 * "categoria_inventario IS NULL": el registro de eventos solo ve productos de catálogo.
 *
 * Los productos se pueden crear, editar y desactivar desde la aplicación. Nunca se borran:
 * los eventos ya guardados los referencian, así que se desactivan y dejan de ofrecerse en
 * los eventos nuevos.
 */
const pool = require('../config/db');

// Grupos del catálogo. El mobiliario no está aquí: vive en el inventario (HU-04 / HU-12).
const CLASIFICACIONES = ['alimento', 'bebida_general', 'bar_cocteleria'];

// Cómo se puede calcular cada grupo. Coincide con lo que sabe mostrar la pantalla de registro:
// los alimentos van por gramos por persona y las bebidas por unidades o por botella compartida.
const TIPOS_POR_CLASIFICACION = {
  alimento: ['porcion_persona'],
  bebida_general: ['unidad_persona', 'botella_compartida'],
  bar_cocteleria: ['unidad_persona', 'botella_compartida']
};

// La unidad de medida se deduce del tipo de cálculo
const UNIDAD_POR_TIPO = {
  porcion_persona: 'g',
  unidad_persona: 'unidades',
  botella_compartida: 'botellas'
};

const LIMITE_NUMERO = 100000; // gramos, unidades o mililitros: más que esto es casi seguro un error
const LIMITE_PRECIO = 100000000;

const CAMPOS = `id, nombre, clasificacion, tipo_calculo, porcion_por_persona, unidad_medida,
  volumen_botella_ml, tamano_porcion_ml, precio_unitario, activo`;

const datosInvalidos = (res, detalle) => res.status(400).json({ error: 'Datos inválidos', detalle });

const esNumeroPositivo = (v, maximo = LIMITE_NUMERO) => typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= maximo;

/**
 * Revisa los datos de un producto (los mismos al crear y al editar).
 * Devuelve { error } con el motivo, o { valores } listos para guardar.
 */
const validarProducto = (body) => {
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
  const { clasificacion, tipo_calculo, porcion_por_persona, volumen_botella_ml, tamano_porcion_ml, precio_unitario } = body;

  if (!nombre || nombre.length > 150) {
    return { error: 'El nombre es obligatorio y admite máximo 150 caracteres.' };
  }
  if (!CLASIFICACIONES.includes(clasificacion)) {
    return { error: `El grupo debe ser uno de: ${CLASIFICACIONES.join(', ')}.` };
  }
  if (!TIPOS_POR_CLASIFICACION[clasificacion].includes(tipo_calculo)) {
    return {
      error: `Para ${clasificacion} el tipo de cálculo debe ser uno de: ${TIPOS_POR_CLASIFICACION[clasificacion].join(', ')}.`
    };
  }
  // El precio es opcional: sin precio queda en 0 y se escribe después (desde el catálogo o al registrar el evento)
  const precio = precio_unitario === undefined || precio_unitario === null ? 0 : precio_unitario;
  if (typeof precio !== 'number' || !Number.isFinite(precio) || precio < 0 || precio > LIMITE_PRECIO) {
    return { error: 'El precio debe ser un número mayor o igual a 0.' };
  }

  let porcion = 0;
  let volumen = 0;
  let tamano = 0;

  if (tipo_calculo === 'botella_compartida') {
    if (!esNumeroPositivo(volumen_botella_ml)) {
      return { error: 'El volumen de la botella (ml) debe ser un número mayor a 0.' };
    }
    if (!esNumeroPositivo(tamano_porcion_ml, volumen_botella_ml)) {
      return { error: 'El tamaño de la porción (ml) debe ser mayor a 0 y no puede superar el volumen de la botella.' };
    }
    volumen = volumen_botella_ml;
    tamano = tamano_porcion_ml;
  } else {
    if (!esNumeroPositivo(porcion_por_persona)) {
      return {
        error: tipo_calculo === 'porcion_persona'
          ? 'Los gramos por persona deben ser un número mayor a 0.'
          : 'Las unidades por persona deben ser un número mayor a 0.'
      };
    }
    porcion = porcion_por_persona;
  }

  return {
    valores: {
      nombre,
      clasificacion,
      tipo_calculo,
      porcion,
      unidad: UNIDAD_POR_TIPO[tipo_calculo],
      volumen,
      tamano,
      precio
    }
  };
};

/**
 * GET /api/catalogo
 * Devuelve los productos activos del catálogo, ordenados por clasificación y nombre.
 * Filtros opcionales: ?clasificacion=alimento y ?incluir_inactivos=true (para la pantalla
 * de administración del catálogo; el registro de eventos solo usa los activos).
 */
const obtenerCatalogo = async (req, res) => {
  try {
    const { clasificacion, incluir_inactivos } = req.query;
    const incluirInactivos = incluir_inactivos === 'true';

    let query = `
      SELECT ${CAMPOS}
      FROM catalogo_productos
      WHERE categoria_inventario IS NULL
        ${incluirInactivos ? '' : 'AND activo = true'}
    `;
    const valores = [];

    if (clasificacion) {
      valores.push(clasificacion);
      query += ` AND clasificacion = $1`;
    }

    query += ` ORDER BY clasificacion ASC, nombre ASC;`;

    const resultado = await pool.query(query, valores);
    res.json(resultado.rows);
  } catch (error) {
    console.error('Error al consultar el catálogo de productos:', error);
    res.status(500).json({
      error: 'Error interno del servidor al consultar el catálogo',
      detalle: error.message
    });
  }
};

/**
 * GET /api/catalogo/:id
 * Devuelve todos los datos de un producto del catálogo (404 si no existe).
 */
const obtenerProductoPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT * FROM catalogo_productos 
      WHERE id = $1 AND activo = true AND categoria_inventario IS NULL;
    `;
    const resultado = await pool.query(query, [id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado en el catálogo' });
    }

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error('Error al consultar el producto:', error);
    res.status(500).json({ error: 'Error al consultar el producto' });
  }
};

/**
 * POST /api/catalogo
 * Crea un producto { nombre, clasificacion, tipo_calculo, porcion_por_persona | volumen_botella_ml +
 * tamano_porcion_ml, precio_unitario }. La unidad de medida se deduce del tipo de cálculo.
 */
const crearProducto = async (req, res) => {
  const { error, valores } = validarProducto(req.body || {});
  if (error) return datosInvalidos(res, error);

  try {
    const resultado = await pool.query(
      `INSERT INTO catalogo_productos
        (nombre, clasificacion, tipo_calculo, porcion_por_persona, unidad_medida,
         volumen_botella_ml, tamano_porcion_ml, precio_unitario)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING ${CAMPOS}`,
      [valores.nombre, valores.clasificacion, valores.tipo_calculo, valores.porcion, valores.unidad,
        valores.volumen, valores.tamano, valores.precio]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    // 23505: ya hay un producto del catálogo con ese nombre (el nombre es único en el catálogo)
    if (err.code === '23505') {
      return res.status(409).json({ error: `Ya existe un producto del catálogo llamado «${valores.nombre}».` });
    }
    console.error('Error al crear el producto del catálogo:', err);
    res.status(500).json({ error: 'Error al crear el producto' });
  }
};

/**
 * PUT /api/catalogo/:id
 * Edita los datos de un producto (se envían todos los campos, igual que al crearlo).
 * Si el producto ya se usó en algún evento, no se puede cambiar su grupo ni su tipo de cálculo:
 * los eventos guardados quedarían con datos que no corresponden. Se puede cambiar el precio,
 * el nombre y las porciones (los eventos ya guardados conservan sus cantidades y costos).
 */
const actualizarProducto = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return datosInvalidos(res, 'El identificador del producto no es válido.');
  }
  const { error, valores } = validarProducto(req.body || {});
  if (error) return datosInvalidos(res, error);

  try {
    const actual = await pool.query(
      `SELECT clasificacion, tipo_calculo,
        (SELECT COUNT(*) FROM evento_productos WHERE producto_id = $1) AS eventos
      FROM catalogo_productos WHERE id = $1 AND categoria_inventario IS NULL`,
      [id]
    );
    if (actual.rowCount === 0) {
      return res.status(404).json({ error: 'Producto no encontrado en el catálogo' });
    }

    const { clasificacion, tipo_calculo, eventos } = actual.rows[0];
    const cambiaEstructura = clasificacion !== valores.clasificacion || tipo_calculo !== valores.tipo_calculo;
    if (cambiaEstructura && Number(eventos) > 0) {
      return res.status(409).json({
        error: `Este producto ya se usa en ${eventos} ${Number(eventos) === 1 ? 'evento' : 'eventos'}: no se puede cambiar su grupo ni su tipo de consumo. Crea un producto nuevo o desactiva este.`
      });
    }

    const resultado = await pool.query(
      `UPDATE catalogo_productos
      SET nombre = $1, clasificacion = $2, tipo_calculo = $3, porcion_por_persona = $4, unidad_medida = $5,
          volumen_botella_ml = $6, tamano_porcion_ml = $7, precio_unitario = $8
      WHERE id = $9 AND categoria_inventario IS NULL
      RETURNING ${CAMPOS}`,
      [valores.nombre, valores.clasificacion, valores.tipo_calculo, valores.porcion, valores.unidad,
        valores.volumen, valores.tamano, valores.precio, id]
    );
    res.json(resultado.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: `Ya existe un producto del catálogo llamado «${valores.nombre}».` });
    }
    console.error('Error al actualizar el producto del catálogo:', err);
    res.status(500).json({ error: 'Error al actualizar el producto' });
  }
};

/**
 * PATCH /api/catalogo/:id/estado
 * Activa o desactiva un producto { activo: true | false }. Un producto desactivado deja de
 * ofrecerse en los eventos nuevos, pero los eventos ya guardados lo conservan.
 */
const cambiarEstadoProducto = async (req, res) => {
  const id = Number(req.params.id);
  const { activo } = req.body || {};

  if (!Number.isInteger(id) || id <= 0) {
    return datosInvalidos(res, 'El identificador del producto no es válido.');
  }
  if (typeof activo !== 'boolean') {
    return datosInvalidos(res, 'activo debe ser verdadero o falso.');
  }

  try {
    const resultado = await pool.query(
      `UPDATE catalogo_productos SET activo = $1
      WHERE id = $2 AND categoria_inventario IS NULL
      RETURNING ${CAMPOS}`,
      [activo, id]
    );
    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'Producto no encontrado en el catálogo' });
    }
    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Error al cambiar el estado del producto:', err);
    res.status(500).json({ error: 'Error al cambiar el estado del producto' });
  }
};

module.exports = {
  obtenerCatalogo,
  obtenerProductoPorId,
  crearProducto,
  actualizarProducto,
  cambiarEstadoProducto
};