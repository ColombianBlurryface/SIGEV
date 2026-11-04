/**
 * Asignación de meseros a un evento (HU-28 · RF-35).
 *
 *   GET /api/eventos/:id/meseros          los meseros asignados y cuántos faltan o sobran frente a los requeridos
 *   PUT /api/eventos/:id/meseros          sincroniza la lista: { personal_ids: [..] } reemplaza la anterior
 *   POST /api/eventos/:id/meseros         igual que PUT (la historia lo define como POST)
 *
 * El detalle del evento (GET /api/eventos/:id) trae el mismo resumen en `asignacion_meseros`. Un mesero eliminado
 * (borrado lógico, HU-27) conserva su asignación como historial pero ya no cuenta ni se muestra.
 */
const pool = require('../config/db');
const { calcularMeseros } = require('../config/reglasPersonal');
const { ESTADOS_CERRADOS, idDeRuta, compararConRequeridos, validarAsignacion } = require('../config/reglasAsignacionPersonal');

const datosInvalidos = (res, detalle) => res.status(400).json({ error: 'Datos inválidos', detalle });

// Los meseros asignados y ACTIVOS de un evento, con la comparación frente a los requeridos (HU-21: 1 por cada 20)
const armarAsignacion = async (cliente, eventoId, asistentes) => {
  const { rows } = await cliente.query(
    `SELECT p.id, p.nombre_completo, p.contacto
     FROM evento_personal ep JOIN personal p ON p.id = ep.personal_id
     WHERE ep.evento_id = $1 AND p.activo = true AND p.rol = 'mesero'
     ORDER BY lower(p.nombre_completo), p.id`,
    [eventoId]
  );
  const requeridos = calcularMeseros(asistentes);
  return {
    evento_id: eventoId,
    total_asignados: rows.length,
    meseros_requeridos: requeridos,
    ...compararConRequeridos(rows.length, requeridos),
    meseros_asignados: rows
  };
};

// Meseros de la lista que ya están en OTRO evento el mismo día: se avisa, no se bloquea
const conflictosDelDia = async (cliente, eventoId, fecha, ids) => {
  if (ids.length === 0) return [];
  const { rows } = await cliente.query(
    `SELECT p.id AS personal_id, p.nombre_completo, e.id AS evento_id, e.nombre_evento
     FROM evento_personal ep
     JOIN eventos e ON e.id = ep.evento_id
     JOIN personal p ON p.id = ep.personal_id
     WHERE ep.personal_id = ANY($1::int[]) AND ep.evento_id <> $2 AND e.fecha_evento = $3 AND e.estado NOT IN ('cancelado')
     ORDER BY p.nombre_completo, e.id`,
    [ids, eventoId, fecha]
  );
  const porMesero = new Map();
  for (const r of rows) {
    const actual = porMesero.get(r.personal_id) || { personal_id: r.personal_id, nombre_completo: r.nombre_completo, otros_eventos: [] };
    actual.otros_eventos.push({ id: r.evento_id, nombre_evento: r.nombre_evento });
    porMesero.set(r.personal_id, actual);
  }
  return [...porMesero.values()];
};

// GET /api/eventos/:id/meseros
const listarMeserosDelEvento = async (req, res) => {
  const id = idDeRuta(req.params.id);
  if (id === null) return datosInvalidos(res, 'El identificador del evento no es válido.');
  try {
    const { rows } = await pool.query('SELECT asistentes FROM eventos WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Evento no encontrado' });
    res.json(await armarAsignacion(pool, id, rows[0].asistentes));
  } catch (error) {
    console.error('Error al consultar los meseros de un evento (HU-28):', error);
    res.status(500).json({ error: 'Error al consultar los meseros del evento' });
  }
};

// PUT|POST /api/eventos/:id/meseros — sincronización completa
const asignarMeseros = async (req, res) => {
  const id = idDeRuta(req.params.id);
  if (id === null) return datosInvalidos(res, 'El identificador del evento no es válido.');
  const datos = validarAsignacion(req.body);
  if (datos.error) return datosInvalidos(res, datos.error);

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    // Se bloquea el evento: dos sincronizaciones a la vez sobre el mismo evento se turnan
    const { rows: eventos } = await cliente.query(
      `SELECT id, asistentes, estado, to_char(fecha_evento, 'YYYY-MM-DD') AS fecha FROM eventos WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (eventos.length === 0) {
      await cliente.query('ROLLBACK');
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    const evento = eventos[0];
    if (ESTADOS_CERRADOS.includes(evento.estado)) {
      await cliente.query('ROLLBACK');
      return res.status(409).json({ error: 'Conflicto', detalle: `No se puede asignar personal a un evento ${evento.estado}.` });
    }

    // Todos deben existir, estar activos y ser meseros. FOR SHARE: si alguien elimina a uno justo ahora, espera a que termine
    if (datos.ids.length > 0) {
      const { rows: validos } = await cliente.query(
        `SELECT id FROM personal WHERE id = ANY($1::int[]) AND activo = true AND rol = 'mesero' FOR SHARE`,
        [datos.ids]
      );
      const existentes = new Set(validos.map((v) => v.id));
      const invalidos = datos.ids.filter((x) => !existentes.has(x));
      if (invalidos.length > 0) {
        await cliente.query('ROLLBACK');
        return datosInvalidos(res, `Uno o más meseros no son válidos o están inactivos (ids: ${invalidos.join(', ')}).`);
      }
    }

    // Sincronización exacta: se quitan los que ya no vienen y se agregan los nuevos (sin duplicar)
    await cliente.query('DELETE FROM evento_personal WHERE evento_id = $1 AND NOT (personal_id = ANY($2::int[]))', [id, datos.ids]);
    await cliente.query(
      `INSERT INTO evento_personal (evento_id, personal_id) SELECT $1, unnest($2::int[]) ON CONFLICT (evento_id, personal_id) DO NOTHING`,
      [id, datos.ids]
    );
    const respuesta = await armarAsignacion(cliente, id, evento.asistentes);
    respuesta.advertencias = await conflictosDelDia(cliente, id, evento.fecha, datos.ids);
    await cliente.query('COMMIT');
    res.json(respuesta);
  } catch (error) {
    await cliente.query('ROLLBACK').catch(() => {});
    console.error('Error al asignar meseros a un evento (HU-28):', error);
    res.status(500).json({ error: 'Error al asignar los meseros al evento' });
  } finally {
    cliente.release();
  }
};

module.exports = { armarAsignacion, listarMeserosDelEvento, asignarMeseros };
