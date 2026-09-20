// backend/src/controllers/catalogoController.js
const pool = require('../config/db');

/**
 * Obtiene los productos del catálogo disponibles para selección en eventos
 * Soporta filtro opcional por query param: /api/catalogo?clasificacion=alimento
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
 * Obtiene el detalle técnico de un producto específico por su ID
 */
const obtenerProductoPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT * FROM catalogo_productos 
      WHERE id = $1 AND activo = true;
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