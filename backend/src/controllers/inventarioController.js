const pool = require('../config/db');

// Cada categoría de inventario se guarda con la clasificación del catálogo que le corresponde.
const CATEGORIAS_INVENTARIO = {
    'Mobiliario': 'mobiliario',
    'Bar/Bebidas': 'bebida_general',
    'Bebidas de Coctelería': 'bar_cocteleria'
};

const CAMPOS_INVENTARIO = 'id, nombre, categoria_inventario, cantidad_propia, cantidad_danada, es_propio, unidad_medida';

const esCantidadValida = (valor) => typeof valor === 'number' && Number.isInteger(valor) && valor >= 0;

const datosInvalidos = (res, detalle) => res.status(400).json({ error: 'Datos inválidos', detalle });

// HU-08 (RF-09): Registrar un elemento del inventario propio
const registrarElemento = async (req, res) => {
    const nombre = typeof req.body.nombre === 'string' ? req.body.nombre.trim() : '';
    const { categoria_inventario, cantidad_propia } = req.body;

    if (!nombre || nombre.length > 150) {
        return datosInvalidos(res, 'El nombre es obligatorio y admite máximo 150 caracteres.');
    }
    if (!CATEGORIAS_INVENTARIO[categoria_inventario]) {
        return datosInvalidos(res, `La categoría debe ser una de: ${Object.keys(CATEGORIAS_INVENTARIO).join(', ')}.`);
    }
    if (!esCantidadValida(cantidad_propia)) {
        return datosInvalidos(res, 'La cantidad disponible debe ser un número entero mayor o igual a 0.');
    }

    try {
        const result = await pool.query(
            `INSERT INTO catalogo_productos
            (nombre, clasificacion, tipo_calculo, unidad_medida, categoria_inventario, cantidad_propia, es_propio)
            VALUES ($1, $2, 'cantidad_fija', 'unidades', $3, $4, true)
            RETURNING ${CAMPOS_INVENTARIO}`,
            [nombre, CATEGORIAS_INVENTARIO[categoria_inventario], categoria_inventario, cantidad_propia]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: `Ya existe un elemento llamado «${nombre}».` });
        }
        console.error('Error al registrar elemento de inventario:', error);
        res.status(500).json({ error: 'Error al registrar el elemento de inventario' });
    }
};

// HU-08 / HU-09: Consultar el inventario, opcionalmente por categoría
const consultarInventario = async (req, res) => {
    const { categoria } = req.query;

    if (categoria && !CATEGORIAS_INVENTARIO[categoria]) {
        return datosInvalidos(res, `La categoría debe ser una de: ${Object.keys(CATEGORIAS_INVENTARIO).join(', ')}.`);
    }

    try {
        let query = `SELECT ${CAMPOS_INVENTARIO} FROM catalogo_productos WHERE categoria_inventario IS NOT NULL AND activo = true`;
        const params = [];

        if (categoria) {
            query += ` AND categoria_inventario = $1`;
            params.push(categoria);
        }

        query += ` ORDER BY categoria_inventario ASC, nombre ASC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al consultar el inventario:', error);
        res.status(500).json({ error: 'Error al consultar el inventario' });
    }
};

// HU-08 (RF-11): Actualizar la cantidad disponible de un elemento
const actualizarCantidad = async (req, res) => {
    const id = Number(req.params.id);
    const { cantidad_propia } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
        return datosInvalidos(res, 'El identificador del elemento no es válido.');
    }
    if (!esCantidadValida(cantidad_propia)) {
        return datosInvalidos(res, 'La cantidad disponible debe ser un número entero mayor o igual a 0.');
    }

    try {
        const result = await pool.query(
            `UPDATE catalogo_productos SET cantidad_propia = $1
            WHERE id = $2 AND categoria_inventario IS NOT NULL
            RETURNING ${CAMPOS_INVENTARIO}`,
            [cantidad_propia, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Elemento de inventario no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al actualizar la cantidad del inventario:', error);
        res.status(500).json({ error: 'Error al actualizar la cantidad del elemento' });
    }
};

module.exports = {
    registrarElemento,
    consultarInventario,
    actualizarCantidad
};
