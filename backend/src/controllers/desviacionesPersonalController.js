/**
 * Controlador de alertas y desviaciones de personal (HU-25 · RF-32).
 *
 * Endpoints:
 *   GET /api/eventos/:id/desviaciones-personal
 *   GET /api/eventos/:id/staff-deviations
 *   GET /api/v1/events/:eventId/staff-deviations
 */
const pool = require('../config/db');
const { idDeRuta } = require('../config/reglasAsignacionPersonal');
const { calcularDesviacionesPersonal } = require('../config/reglasDesviacionesPersonal');

/**
 * Consulta en la base de datos la cantidad de personal asignado por rol y calcula las desviaciones.
 *
 * @param {object} cliente - Conexión de pool o cliente pg
 * @param {number} eventoId - Identificador del evento
 * @param {number} asistentes - Asistentes del evento
 */
const armarDesviacionesPersonal = async (cliente, eventoId, asistentes) => {
  const { rows } = await cliente.query(
    `SELECT p.rol, COUNT(*)::int AS total
     FROM evento_personal ep
     JOIN personal p ON p.id = ep.personal_id
     WHERE ep.evento_id = $1 AND p.activo = true
     GROUP BY p.rol`,
    [eventoId]
  );

  const conteos = { meseros: 0, cocineros: 0 };
  for (const r of rows) {
    if (r.rol === 'mesero') conteos.meseros = r.total;
    if (r.rol === 'cocinero') conteos.cocineros = r.total;
  }

  return calcularDesviacionesPersonal(eventoId, asistentes, conteos);
};

/**
 * Controlador para responder el endpoint de consulta de desviaciones de personal.
 */
const obtenerDesviacionesPersonal = async (req, res) => {
  const idRaw = req.params.id || req.params.eventId;
  const id = idDeRuta(idRaw);
  if (id === null) {
    return res.status(400).json({ error: 'Datos inválidos', detalle: 'El identificador del evento no es válido.' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, asistentes, estado FROM eventos WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Evento no encontrado', detalle: `No existe el evento con id ${id}.` });
    }

    const evento = rows[0];
    const reporte = await armarDesviacionesPersonal(pool, id, evento.asistentes);
    res.json(reporte);
  } catch (error) {
    console.error('Error al consultar desviaciones de personal (HU-25):', error);
    res.status(500).json({ error: 'Error al consultar las desviaciones de personal', detalle: error.message });
  }
};

module.exports = {
  armarDesviacionesPersonal,
  obtenerDesviacionesPersonal
};

