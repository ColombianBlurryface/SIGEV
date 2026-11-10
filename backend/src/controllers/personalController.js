/**
 * Controlador del personal de servicio (HU-26 · RF-33). Hoy solo meseros.
 *
 *   POST /api/personal           registra un mesero { nombre_completo, contacto, rol? }
 *   GET  /api/personal?rol=      lista el personal ACTIVO, ordenado por nombre
 *   DELETE /api/personal/:id     elimina un mesero (HU-27 · RF-34): borrado lógico, el registro pasa a inactivo
 *
 * Los datos de un mesero NO se modifican (no hay PUT ni PATCH): si hubo un error, se elimina y se vuelve a registrar.
 *
 * Las reglas de los datos están en config/reglasRegistroPersonal.js.
 */
const pool = require('../config/db');
const { ROLES, normalizarRol, validarPersonal, idDeRuta } = require('../config/reglasRegistroPersonal');

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

// DELETE /api/personal/:id (HU-27 · RF-34)
// Borrado LÓGICO del mesero: pasa a inactivo y deja de listarse; se puede volver a registrar con los mismos datos. Sus
// asignaciones a eventos SÍ se borran (RF-38: no se guarda historial de asignaciones, HU-30).
// Una transacción: se desactiva (eso bloquea la fila del mesero, igual que al asignarlo) y se borran sus asignaciones.
const eliminarPersonal = async (req, res) => {
  const id = idDeRuta(req.params.id);
  if (id === null) return datosInvalidos(res, 'El id del mesero debe ser un número entero positivo.');
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    // Solo toca un mesero ACTIVO, así dos eliminaciones simultáneas no pasan las dos
    const { rowCount } = await cliente.query(
      `UPDATE personal SET activo = false WHERE id = $1 AND rol = 'mesero' AND activo = true`,
      [id]
    );
    if (rowCount === 0) {
      await cliente.query('ROLLBACK');
      return res.status(404).json({ error: 'No encontrado', detalle: `El mesero con ID ${id} no existe o ya fue eliminado.` });
    }
    await cliente.query('DELETE FROM evento_personal WHERE personal_id = $1', [id]);
    await cliente.query('COMMIT');
    res.status(204).end();
  } catch (error) {
    await cliente.query('ROLLBACK').catch(() => {});
    console.error('Error al eliminar un mesero (HU-27):', error);
    res.status(500).json({ error: 'Error al eliminar el mesero' });
  } finally {
    cliente.release();
  }
};

// Cualquier otro método sobre /api/personal/:id (PUT, PATCH, POST, GET): los datos de un mesero no se modifican
const metodoNoPermitido = (req, res) => {
  res.set('Allow', 'DELETE').status(405).json({
    error: 'Método no permitido',
    detalle: 'Los datos de un mesero no se modifican: elimínalo y regístralo de nuevo.'
  });
};

module.exports = { crearPersonal, listarPersonal, eliminarPersonal, metodoNoPermitido };
