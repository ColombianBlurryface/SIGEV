/**
 * Controlador del catálogo de productos.
 *
 * El catálogo guarda los alimentos y bebidas con sus porciones y precios, que se
 * usan para calcular las cantidades de cada evento. La misma tabla también guarda
 * los elementos del inventario, por eso aquí se filtran con
 * "categoria_inventario IS NULL": el registro de eventos solo ve productos de catálogo.
 */
const pool = require('../config/db');

/**
 * GET /api/catalogo
 * Devuelve los productos activos del catálogo, ordenados por clasificación y nombre.
 * Filtro opcional: /api/catalogo?clasificacion=alimento
 */
const obtenerCatalogo = async (req, res) => {
  try {
    const { clasificacion } = req.query;

    let query = `
      SELECT 
        id,
        nombre,
        clasificacion,
        tipo_calculo,
        porcion_por_persona,
        unidad_medida,
        volumen_botella_ml,
        tamano_porcion_ml,
        precio_unitario
      FROM catalogo_productos
      WHERE activo = true
        AND categoria_inventario IS NULL
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

module.exports = {
  obtenerCatalogo,
  obtenerProductoPorId
};