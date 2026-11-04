/**
 * Controlador del personal de servicio (HU-26 · RF-33). Hoy solo meseros.
 *
 *   POST /api/personal           registra un mesero { nombre_completo, contacto, rol? }
 *   GET  /api/personal?rol=      lista el personal ACTIVO, ordenado por nombre
 *
 * Las reglas de los datos están en config/reglasRegistroPersonal.js.
 */
const pool = require('../config/db');
const { ROLES, normalizarRol, validarPersonal } = require('../config/reglasRegistroPersonal');

const CAMPOS = 'id, nombre_completo, contacto, rol, activo, creado_en';

const datosInvalidos = (res, detalle) => res.status(400).json({ error: 'Datos inválidos', detalle });

// POST /api/personal
const crearPersonal = async (req, res) => {
  const datos = validarPersonal(req.body);
  if (datos.error) return datosInvalidos(res, datos.error);
  try {
    // Todo mesero nuevo queda activo (disponible para asignarlo a eventos)
    const { rows } = await pool.query(
      `INSERT INTO personal (nombre_completo, contacto, rol) VALUES ($1, $2, $3) RETURNING ${CAMPOS}`,
      [datos.nombre_completo, datos.contacto, datos.rol]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Conflicto', detalle: 'Ya hay un mesero activo con ese nombre y ese contacto.' });
    }
    console.error('Error al registrar personal (HU-26):', error);
    res.status(500).json({ error: 'Error al registrar el mesero' });
  }
};

// GET /api/personal?rol=mesero
const listarPersonal = async (req, res) => {
  const { rol } = req.query;
  let filtro = null;
  if (rol !== undefined) {
    filtro = normalizarRol(rol);
    if (!filtro) return datosInvalidos(res, `El rol debe ser uno de: ${ROLES.join(', ')}.`);
  }
  try {
    const { rows } = await pool.query(
      `SELECT ${CAMPOS} FROM personal WHERE activo = true AND ($1::text IS NULL OR rol = $1) ORDER BY lower(nombre_completo), id`,
      [filtro]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error al listar el personal (HU-26):', error);
    res.status(500).json({ error: 'Error al consultar el personal' });
  }
};

module.exports = { crearPersonal, listarPersonal };
