/**
 * Middleware que valida los datos básicos antes de registrar un evento.
 *
 * Se ejecuta antes de crearEvento (ver routes/eventosRoutes.js). Si algún dato
 * no cumple las reglas, responde 400 con el motivo y la petición no continúa.
 */
const validarCreacionEvento = (req, res, next) => {
  const { nombre_evento, fecha_evento, tipo_evento, duracion_horas, asistentes } = req.body;

  // Validación de campos base (RF-01, RF-02)
  if (!nombre_evento || !fecha_evento || !tipo_evento || !duracion_horas || asistentes === undefined) {
    return res.status(400).json({
      error: 'Campos requeridos faltantes',
      detalle: 'nombre_evento, fecha_evento, tipo_evento, duracion_horas y asistentes son obligatorios.'
    });
  }
// NUEVO: Regla de negocio: la fecha debe ser el día actual o posterior (RF-02, RN-14)
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }); // Formato 'AAAA-MM-DD'
  if (fecha_evento < hoy) {
    return res.status(400).json({
      error: 'Regla de negocio no cumplida (RN-14 / RF-02)',
      detalle: 'La fecha del evento debe ser el día actual o posterior.'
    });
  }
  // Regla de negocio: un evento debe tener entre 40 y 600 asistentes (RF-08, RN-01)
  const cantAsistentes = parseInt(asistentes, 10);
  if (isNaN(cantAsistentes) || cantAsistentes < 40 || cantAsistentes > 600) {
    return res.status(400).json({
      error: 'Regla de negocio no cumplida (RN-01 / RF-08)',
      detalle: 'La cantidad de asistentes debe estar en el rango de 40 a 600 personas.'
    });
  }


// AJUSTADO: la duración debe estar entre 3 y 8 horas (RF-02, RN-14)
  const duracion = parseFloat(duracion_horas);
  if (isNaN(duracion) || duracion < 3 || duracion > 8) {
    return res.status(400).json({
      error: 'Duración inválida',
      detalle: 'La duración en horas debe estar entre 3 y 8 horas.'
    });
  }
  next();
};

module.exports = { validarCreacionEvento };