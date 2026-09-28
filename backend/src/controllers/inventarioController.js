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

const TIPOS_MOVIMIENTO = ['registro', 'adquisicion', 'ajuste'];
const CANTIDAD_MAXIMA_ADQUISICION = 100000;

const leerNotas = (valor) => (typeof valor === 'string' ? valor.trim() : '');

const registrarMovimiento = (client, { productoId, tipo, cantidad, cantidadResultante, notas }) =>
    client.query(
        `INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, cantidad_resultante, notas)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, producto_id, tipo, cantidad, cantidad_resultante, notas, creado_en`,
        [productoId, tipo, cantidad, cantidadResultante, notas || null]
    );

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

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const result = await client.query(
            `INSERT INTO catalogo_productos
            (nombre, clasificacion, tipo_calculo, unidad_medida, categoria_inventario, cantidad_propia, es_propio)
            VALUES ($1, $2, 'cantidad_fija', 'unidades', $3, $4, true)
            RETURNING ${CAMPOS_INVENTARIO}`,
            [nombre, CATEGORIAS_INVENTARIO[categoria_inventario], categoria_inventario, cantidad_propia]
        );
        const elemento = result.rows[0];

        if (cantidad_propia > 0) {
            await registrarMovimiento(client, {
                productoId: elemento.id,
                tipo: 'registro',
                cantidad: cantidad_propia,
                cantidadResultante: cantidad_propia,
                notas: 'Registro inicial del elemento'
            });
        }

        await client.query('COMMIT');
        res.status(201).json(elemento);
    } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23505') {
            return res.status(409).json({ error: `Ya existe un elemento llamado «${nombre}».` });
        }
        console.error('Error al registrar elemento de inventario:', error);
        res.status(500).json({ error: 'Error al registrar el elemento de inventario' });
    } finally {
        client.release();
    }
};

// HU-08: Consultar el inventario, opcionalmente por categoría
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

// HU-08 (RF-11): Actualizar la cantidad disponible; el cambio queda como ajuste en los movimientos
const actualizarCantidad = async (req, res) => {
    const id = Number(req.params.id);
    const { cantidad_propia } = req.body;
    const motivo = leerNotas(req.body.motivo);

    if (!Number.isInteger(id) || id <= 0) {
        return datosInvalidos(res, 'El identificador del elemento no es válido.');
    }
    if (!esCantidadValida(cantidad_propia)) {
        return datosInvalidos(res, 'La cantidad disponible debe ser un número entero mayor o igual a 0.');
    }
    if (motivo.length > 300) {
        return datosInvalidos(res, 'El motivo admite máximo 300 caracteres.');
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const actual = await client.query(
            `SELECT cantidad_propia FROM catalogo_productos
            WHERE id = $1 AND categoria_inventario IS NOT NULL
            FOR UPDATE`,
            [id]
        );

        if (actual.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Elemento de inventario no encontrado' });
        }

        const diferencia = cantidad_propia - actual.rows[0].cantidad_propia;
        const result = await client.query(
            `UPDATE catalogo_productos SET cantidad_propia = $1 WHERE id = $2 RETURNING ${CAMPOS_INVENTARIO}`,
            [cantidad_propia, id]
        );

        if (diferencia !== 0) {
            await registrarMovimiento(client, {
                productoId: id,
                tipo: 'ajuste',
                cantidad: diferencia,
                cantidadResultante: cantidad_propia,
                notas: motivo
            });
        }

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al actualizar la cantidad del inventario:', error);
        res.status(500).json({ error: 'Error al actualizar la cantidad del elemento' });
    } finally {
        client.release();
    }
};

// HU-09 (RF-13): Registrar una adquisición de un elemento existente; suma a la cantidad disponible
const registrarAdquisicion = async (req, res) => {
    const id = Number(req.params.id);
    const { cantidad } = req.body;
    const notas = leerNotas(req.body.notas);

    if (!Number.isInteger(id) || id <= 0) {
        return datosInvalidos(res, 'El identificador del elemento no es válido.');
    }
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > CANTIDAD_MAXIMA_ADQUISICION) {
        return datosInvalidos(res, `La cantidad adquirida debe ser un número entero entre 1 y ${CANTIDAD_MAXIMA_ADQUISICION}.`);
    }
    if (notas.length > 300) {
        return datosInvalidos(res, 'Las notas admiten máximo 300 caracteres.');
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const actualizado = await client.query(
            `UPDATE catalogo_productos SET cantidad_propia = cantidad_propia + $1
            WHERE id = $2 AND categoria_inventario IS NOT NULL
            RETURNING ${CAMPOS_INVENTARIO}`,
            [cantidad, id]
        );

        if (actualizado.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Elemento de inventario no encontrado' });
        }

        const elemento = actualizado.rows[0];
        const movimiento = await registrarMovimiento(client, {
            productoId: id,
            tipo: 'adquisicion',
            cantidad,
            cantidadResultante: elemento.cantidad_propia,
            notas
        });

        await client.query('COMMIT');
        res.status(201).json({ elemento, movimiento: movimiento.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al registrar la adquisición:', error);
        res.status(500).json({ error: 'Error al registrar la adquisición' });
    } finally {
        client.release();
    }
};

// HU-09: Consultar los movimientos del inventario (los más recientes primero)
const consultarMovimientos = async (req, res) => {
    const limite = req.query.limite === undefined ? 20 : Number(req.query.limite);
    const elementoId = req.query.elemento_id === undefined ? null : Number(req.query.elemento_id);
    const { tipo } = req.query;

    if (!Number.isInteger(limite) || limite < 1 || limite > 200) {
        return datosInvalidos(res, 'El límite debe ser un número entero entre 1 y 200.');
    }
    if (elementoId !== null && (!Number.isInteger(elementoId) || elementoId <= 0)) {
        return datosInvalidos(res, 'El identificador del elemento no es válido.');
    }
    if (tipo !== undefined && !TIPOS_MOVIMIENTO.includes(tipo)) {
        return datosInvalidos(res, `El tipo debe ser uno de: ${TIPOS_MOVIMIENTO.join(', ')}.`);
    }

    try {
        const condiciones = [];
        const params = [];

        if (elementoId !== null) {
            params.push(elementoId);
            condiciones.push(`m.producto_id = $${params.length}`);
        }
        if (tipo !== undefined) {
            params.push(tipo);
            condiciones.push(`m.tipo = $${params.length}`);
        }
        params.push(limite);

        const result = await pool.query(
            `SELECT m.id, m.producto_id, c.nombre, c.categoria_inventario, m.tipo, m.cantidad,
                m.cantidad_resultante, m.notas, m.creado_en
            FROM movimientos_inventario m
            JOIN catalogo_productos c ON c.id = m.producto_id
            ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}
            ORDER BY m.creado_en DESC, m.id DESC
            LIMIT $${params.length}`,
            params
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error al consultar los movimientos del inventario:', error);
        res.status(500).json({ error: 'Error al consultar los movimientos del inventario' });
    }
};

module.exports = {
    registrarElemento,
    consultarInventario,
    actualizarCantidad,
    registrarAdquisicion,
    consultarMovimientos
};
