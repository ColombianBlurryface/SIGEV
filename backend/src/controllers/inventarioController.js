const pool = require('../config/db');

// HU-08 y HU-09: Registrar y clasificar elementos de inventario
const registrarElemento = async (req, res) => {
    try {
        const { 
            nombre, 
            clasificacion, 
            tipo_calculo, 
            unidad_medida, 
            categoria_inventario, 
            cantidad_propia, 
            es_propio 
        } = req.body;

        const result = await pool.query(
            `INSERT INTO catalogo_productos 
            (nombre, clasificacion, tipo_calculo, unidad_medida, categoria_inventario, cantidad_propia, es_propio) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [nombre, clasificacion, tipo_calculo, unidad_medida, categoria_inventario, cantidad_propia, es_propio]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    registrarElemento
};
const consultarInventario = async (req, res) => {
    try {
        const { categoria } = req.query;
        let query = `SELECT * FROM catalogo_productos WHERE categoria_inventario IS NOT NULL`;
        const params = [];

        if (categoria) {
            query += ` AND categoria_inventario = $1`;
            params.push(categoria);
        }

        query += ` ORDER BY categoria_inventario ASC, nombre ASC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    registrarElemento,
    consultarInventario
}; 