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
  // El nombre admite máximo 150 caracteres (límite de la columna): sin esto, la base de datos respondía con un error 500
  if (typeof nombre_evento !== 'string' || nombre_evento.trim().length > 150) {
    return res.status(400).json({
      error: 'Datos inválidos',
      detalle: 'El nombre del evento es obligatorio y admite máximo 150 caracteres.'
    });
  }
  // La fecha debe ser un día real con formato AAAA-MM-DD («2026-13-45» o «mañana» no lo son)
  const esFechaReal = typeof fecha_evento === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha_evento) &&
    !Number.isNaN(Date.parse(fecha_evento)) && new Date(fecha_evento).toISOString().slice(0, 10) === fecha_evento;
  if (!esFechaReal) {
    return res.status(400).json({
      error: 'Datos inválidos',
      detalle: 'La fecha del evento debe ser un día real con el formato AAAA-MM-DD.'
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
  // Number (y no parseInt) para que «100.5» o «100 personas» no pasen como si fueran 100
  const cantAsistentes = Number(asistentes);
  if (!Number.isInteger(cantAsistentes) || cantAsistentes < 40 || cantAsistentes > 600) {
    return res.status(400).json({
      error: 'Regla de negocio no cumplida (RN-01 / RF-08)',
      detalle: 'La cantidad de asistentes debe estar en el rango de 40 a 600 personas.'
    });
  }


// AJUSTADO: la duración debe estar entre 3 y 8 horas (RF-02, RN-14)
  // Number (y no parseFloat) para que «4 horas» no pase como si fuera 4 y reviente al guardar
  const duracion = Number(duracion_horas);
  if (!Number.isFinite(duracion) || duracion < 3 || duracion > 8) {
    return res.status(400).json({
      error: 'Duración inválida',
      detalle: 'La duración en horas debe estar entre 3 y 8 horas.'
    });
  }
  next();
};

module.exports = { validarCreacionEvento };