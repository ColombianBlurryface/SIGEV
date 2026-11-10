/**
 * Asignación de meseros a un evento (HU-28 · RF-35).
 *
 *   GET /api/eventos/:id/meseros              los meseros asignados y cuántos faltan frente a los requeridos
 *   GET /api/eventos/:id/meseros/disponibles  los meseros registrados, marcando los asignados y los ocupados en otro evento
 *   PUT /api/eventos/:id/meseros              sincroniza la lista: { personal_ids: [..] } reemplaza la anterior
 *   POST /api/eventos/:id/meseros             igual que PUT (la historia lo define como POST)
 *   PATCH /api/eventos/:id/meseros/:personalId/estado   cambia el estado de UNA asignación (HU-29 · RF-36)
 *
 * Estado de cada asignación (HU-29): por_confirmar (al asignar), confirmado o no_puede. Quien «no puede» sigue en la lista
 * pero NO cuenta para el estándar de personal (HU-25) ni para el tope, ni bloquea su horario en otro evento. Sincronizar la
 * lista (PUT/POST) conserva el estado de los que ya estaban, agrega los nuevos «por_confirmar» y borra solo los que salen.
 *
 * Reglas (ver config/reglasAsignacionPersonal.js): no se asignan más meseros que los requeridos (1 por cada 20
 * asistentes) y un mesero no puede estar en dos eventos que se cruzan en el tiempo (si uno termina justo cuando empieza
 * el otro, sí se puede). El detalle del evento (GET /api/eventos/:id) trae el mismo resumen en `asignacion_meseros`. Un
 * mesero eliminado (borrado lógico, HU-27) conserva su asignación como historial pero ya no cuenta ni se muestra.
 */
const pool = require('../config/db');
const { calcularMeseros } = require('../config/reglasPersonal');
const {
  ESTADOS_CERRADOS, ESTADO_NO_CUENTA, ESTADO_POR_DEFECTO, idDeRuta, compararConRequeridos, validarAsignacion, validarEstado, contarUtiles
} = require('../config/reglasAsignacionPersonal');

// Código en inglés de cada estado (el que usa la historia HU-29)
const CODIGO_INGLES = { por_confirmar: 'PENDING', confirmado: 'CONFIRMED', no_puede: 'UNAVAILABLE' };

const datosInvalidos = (res, detalle) => res.status(400).json({ error: 'Datos inválidos', detalle });

// Inicio y fin de un evento como instantes (fecha + hora de inicio, y esa hora + la duración). Sin hora de inicio, el
// evento ocupa todo el día. Se calcula en SQL para que la comparación sea exacta y atómica con la asignación.
const INICIO = (e) => `(${e}.fecha_evento + COALESCE(${e}.hora_inicio, TIME '00:00'))`;
const FIN = (e) =>
  `(CASE WHEN ${e}.hora_inicio IS NULL THEN (${e}.fecha_evento + 1)::timestamp ELSE (${e}.fecha_evento + ${e}.hora_inicio) + ${e}.duracion_horas * INTERVAL '1 hour' END)`;

// «18:00 – 24:00», «22:00 – 02:00 (día siguiente)» o «todo el día»
const describirHorario = (c) => {
  if (!c.hora_inicio) return 'todo el día';
  return `${c.hora_inicio} – ${c.fin_hora}${c.fin_fecha !== c.fecha ? ' (día siguiente)' : ''}`;
};

// Los meseros asignados y ACTIVOS de un evento, con la comparación frente a los requeridos (HU-21: 1 por cada 20).
// Solo cuentan para el estándar los que no están en «no_puede» (HU-29).
const armarAsignacion = async (cliente, eventoId, asistentes) => {
  const { rows } = await cliente.query(
    `SELECT p.id, p.nombre_completo, p.contacto, ep.estado
     FROM evento_personal ep JOIN personal p ON p.id = ep.personal_id
     WHERE ep.evento_id = $1 AND p.activo = true AND p.rol = 'mesero'
     ORDER BY lower(p.nombre_completo), p.id`,
    [eventoId]
  );
  const requeridos = calcularMeseros(asistentes);
  const utiles = contarUtiles(rows.map((r) => r.estado));
  const comparacion = compararConRequeridos(utiles, requeridos);
  const falta = comparacion.deficit;

  return {
    evento_id: eventoId,
    total_asignados: rows.length,
    total_utiles: utiles,
    por_confirmar: rows.filter((r) => r.estado === 'por_confirmar').length,
    confirmados: rows.filter((r) => r.estado === 'confirmado').length,
    no_pueden: rows.length - utiles,
    meseros_requeridos: requeridos,
    ...comparacion,
    alerta_personal: {
      activa: comparacion.estado === 'deficit',
      tipo: comparacion.estado,
      diferencia: comparacion.diferencia,
      deficit: comparacion.deficit,
      mensaje: comparacion.estado === 'deficit'
        ? `Faltan ${falta} ${falta === 1 ? 'mesero' : 'meseros'} para cumplir con el estándar requerido para ${asistentes} asistentes (1 por cada 20 asistentes).`
        : comparacion.estado === 'completo'
          ? 'La dotación de meseros cumple con el estándar requerido (1 por cada 20 asistentes).'
          : `La dotación de meseros supera el estándar requerido (+${comparacion.excedente} ${comparacion.excedente === 1 ? 'mesero' : 'meseros'}).`
    },
    meseros_asignados: rows.map((r) => ({ ...r, assignment_status: CODIGO_INGLES[r.estado] }))
  };
};

// De esos meseros, los que ya están en OTRO evento que se cruza con este (misma fecha y horas que se pisan)
const conflictosDeCruce = async (cliente, eventoId, ids) => {
  if (ids.length === 0) return [];
  const { rows } = await cliente.query(
    `SELECT p.id AS personal_id, p.nombre_completo, o.id AS evento_id, o.nombre_evento,
            to_char(o.fecha_evento, 'YYYY-MM-DD') AS fecha, to_char(o.hora_inicio, 'HH24:MI') AS hora_inicio,
            to_char(${FIN('o')}, 'HH24:MI') AS fin_hora, to_char(${FIN('o')}, 'YYYY-MM-DD') AS fin_fecha
     FROM eventos e
     JOIN evento_personal ep ON ep.personal_id = ANY($1::int[]) AND ep.evento_id <> e.id
     JOIN eventos o ON o.id = ep.evento_id
     JOIN personal p ON p.id = ep.personal_id
     WHERE e.id = $2 AND o.estado <> 'cancelado' AND p.activo = true AND ep.estado <> '${ESTADO_NO_CUENTA}'
       AND ${INICIO('o')} < ${FIN('e')} AND ${INICIO('e')} < ${FIN('o')}
     ORDER BY p.nombre_completo, o.fecha_evento, o.hora_inicio, o.id`,
    [ids, eventoId]
  );
  return rows.map((r) => ({ ...r, horario: describirHorario(r) }));
};

const cargarEvento = async (cliente, id, bloquear = false) => {
  const { rows } = await cliente.query(
    `SELECT id, asistentes, estado FROM eventos WHERE id = $1 ${bloquear ? 'FOR UPDATE' : ''}`,
    [id]
  );
  return rows[0] || null;
};

// GET /api/eventos/:id/meseros
const listarMeserosDelEvento = async (req, res) => {
  const id = idDeRuta(req.params.id);
  if (id === null) return datosInvalidos(res, 'El identificador del evento no es válido.');
  try {
    const evento = await cargarEvento(pool, id);
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });
    res.json(await armarAsignacion(pool, id, evento.asistentes));
  } catch (error) {
    console.error('Error al consultar los meseros de un evento (HU-28):', error);
    res.status(500).json({ error: 'Error al consultar los meseros del evento' });
  }
};

// GET /api/eventos/:id/meseros/disponibles — todos los meseros activos, con su situación frente a ESTE evento
const listarMeserosDisponibles = async (req, res) => {
  const id = idDeRuta(req.params.id);
  if (id === null) return datosInvalidos(res, 'El identificador del evento no es válido.');
  try {
    const evento = await cargarEvento(pool, id);
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });
    const { rows: meseros } = await pool.query(
      `SELECT id, nombre_completo, contacto FROM personal WHERE activo = true AND rol = 'mesero' ORDER BY lower(nombre_completo), id`
    );
    const { rows: propios } = await pool.query('SELECT personal_id, estado FROM evento_personal WHERE evento_id = $1', [id]);
    const asignados = new Map(propios.map((r) => [r.personal_id, r.estado]));
    const conflictos = await conflictosDeCruce(pool, id, meseros.map((m) => m.id));
    res.json({
      evento_id: id,
      meseros_requeridos: calcularMeseros(evento.asistentes),
      meseros: meseros.map((m) => ({
        ...m,
        asignado: asignados.has(m.id),
        estado: asignados.get(m.id) || null,
        ocupado_en: conflictos
          .filter((c) => c.personal_id === m.id)
          .map(({ evento_id, nombre_evento, fecha, horario }) => ({ evento_id, nombre_evento, fecha, horario }))
      }))
    });
  } catch (error) {
    console.error('Error al consultar los meseros disponibles (HU-28):', error);
    res.status(500).json({ error: 'Error al consultar los meseros disponibles' });
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
    const evento = await cargarEvento(cliente, id, true);
    if (!evento) {
      await cliente.query('ROLLBACK');
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    if (ESTADOS_CERRADOS.includes(evento.estado)) {
      await cliente.query('ROLLBACK');
      return res.status(409).json({ error: 'Conflicto', detalle: `No se puede asignar personal a un evento ${evento.estado}.` });
    }

    // Quienes ya están en este evento como «no puede» se quedan así y no cuentan para el tope ni para los cruces (HU-29)
    const { rows: actuales } = await cliente.query('SELECT personal_id FROM evento_personal WHERE evento_id = $1 AND estado = $2', [id, ESTADO_NO_CUENTA]);
    const noPueden = new Set(actuales.map((r) => r.personal_id));
    const queCuentan = datos.ids.filter((x) => !noPueden.has(x));

    // TOPE: no más meseros que los requeridos (1 por cada 20 asistentes)
    const requeridos = calcularMeseros(evento.asistentes);
    if (queCuentan.length > requeridos) {
      await cliente.query('ROLLBACK');
      return datosInvalidos(
        res,
        `Este evento requiere ${requeridos} ${requeridos === 1 ? 'mesero' : 'meseros'} (1 por cada 20 asistentes): no puedes asignar más (enviaste ${queCuentan.length}${noPueden.size ? ', sin contar a quienes marcaste como «no puede»' : ''}).`
      );
    }

    if (datos.ids.length > 0) {
      // Todos deben existir, estar activos y ser meseros. FOR UPDATE y en orden de id: quien asigna al mismo mesero a
      // otro evento (o lo elimina) espera a que esto termine, así dos asignaciones a la vez no lo cruzan.
      const { rows: validos } = await cliente.query(
        `SELECT id FROM personal WHERE id = ANY($1::int[]) AND activo = true AND rol = 'mesero' ORDER BY id FOR UPDATE`,
        [datos.ids]
      );
      const existentes = new Set(validos.map((v) => v.id));
      const invalidos = datos.ids.filter((x) => !existentes.has(x));
      if (invalidos.length > 0) {
        await cliente.query('ROLLBACK');
        return datosInvalidos(res, `Uno o más meseros no son válidos o están inactivos (ids: ${invalidos.join(', ')}).`);
      }

      // CRUCES: ninguno puede estar en otro evento que se cruce con este
      const conflictos = await conflictosDeCruce(cliente, id, queCuentan);
      if (conflictos.length > 0) {
        await cliente.query('ROLLBACK');
        const c = conflictos[0];
        const otros = conflictos.length > 1 ? ` (y ${conflictos.length - 1} cruce${conflictos.length - 1 === 1 ? '' : 's'} más)` : '';
        return res.status(409).json({
          error: 'Conflicto',
          detalle: `${c.nombre_completo} ya está asignado a «${c.nombre_evento}» el ${c.fecha} (${c.horario}), que se cruza con este evento${otros}. Si un evento termina justo cuando empieza el otro, sí se puede asignar.`,
          conflictos: conflictos.map(({ personal_id, nombre_completo, evento_id, nombre_evento, fecha, horario }) => ({ personal_id, nombre_completo, evento_id, nombre_evento, fecha, horario }))
        });
      }
    }

    // Sincronización exacta: se quitan los que ya no vienen (borrado físico, RF-38: sin historial de asignaciones) y se
    // agregan los nuevos «por_confirmar». Los que ya estaban no se tocan: conservan su estado.
    await cliente.query('DELETE FROM evento_personal WHERE evento_id = $1 AND NOT (personal_id = ANY($2::int[]))', [id, datos.ids]);
    await cliente.query(
      `INSERT INTO evento_personal (evento_id, personal_id, estado) SELECT $1, unnest($2::int[]), $3 ON CONFLICT (evento_id, personal_id) DO NOTHING`,
      [id, datos.ids, ESTADO_POR_DEFECTO]
    );
    const respuesta = await armarAsignacion(cliente, id, evento.asistentes);
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

// PATCH /api/eventos/:id/meseros/:personalId/estado  { estado }  (también /staff/:personalId/status con { status })
const cambiarEstadoAsignacion = async (req, res) => {
  const id = idDeRuta(req.params.id);
  const personalId = idDeRuta(req.params.personalId);
  if (id === null) return datosInvalidos(res, 'El identificador del evento no es válido.');
  if (personalId === null) return datosInvalidos(res, 'El identificador del mesero no es válido.');
  const datos = validarEstado(req.body);
  if (datos.error) return datosInvalidos(res, datos.error);

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const evento = await cargarEvento(cliente, id, true);
    if (!evento) {
      await cliente.query('ROLLBACK');
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    // La asignación debe existir (y el mesero seguir activo). Se bloquea al mesero igual que al asignar.
    const { rows } = await cliente.query(
      `SELECT ep.estado, p.nombre_completo
       FROM evento_personal ep JOIN personal p ON p.id = ep.personal_id
       WHERE ep.evento_id = $1 AND ep.personal_id = $2 AND p.activo = true AND p.rol = 'mesero'
       FOR UPDATE OF ep, p`,
      [id, personalId]
    );
    if (rows.length === 0) {
      await cliente.query('ROLLBACK');
      return res.status(404).json({ error: 'Asignación no encontrada', detalle: 'Ese mesero no está asignado a este evento.' });
    }
    if (ESTADOS_CERRADOS.includes(evento.estado)) {
      await cliente.query('ROLLBACK');
      return res.status(409).json({ error: 'Conflicto', detalle: `No se puede cambiar el estado del personal de un evento ${evento.estado}.` });
    }

    const { estado: anterior, nombre_completo: nombre } = rows[0];
    // Si vuelve a contar (de «no puede» a «por confirmar»/«confirmado») debe caber en el tope y no cruzarse con otro evento
    if (anterior === ESTADO_NO_CUENTA && datos.estado !== ESTADO_NO_CUENTA) {
      const actual = await armarAsignacion(cliente, id, evento.asistentes);
      if (actual.total_utiles + 1 > actual.meseros_requeridos) {
        await cliente.query('ROLLBACK');
        return datosInvalidos(
          res,
          `Este evento requiere ${actual.meseros_requeridos} ${actual.meseros_requeridos === 1 ? 'mesero' : 'meseros'} y ya hay ${actual.total_utiles} que cuentan: ${nombre} no puede volver a contar sin quitar antes a otro.`
        );
      }
      const conflictos = await conflictosDeCruce(cliente, id, [personalId]);
      if (conflictos.length > 0) {
        await cliente.query('ROLLBACK');
        const c = conflictos[0];
        return res.status(409).json({
          error: 'Conflicto',
          detalle: `${nombre} ya está asignado a «${c.nombre_evento}» el ${c.fecha} (${c.horario}), que se cruza con este evento.`
        });
      }
    }

    await cliente.query('UPDATE evento_personal SET estado = $3 WHERE evento_id = $1 AND personal_id = $2', [id, personalId, datos.estado]);
    const asignacion = await armarAsignacion(cliente, id, evento.asistentes);
    await cliente.query('COMMIT');
    res.json({
      evento_id: id,
      personal_id: personalId,
      nombre_completo: nombre,
      estado: datos.estado,
      event_id: id,
      staff_id: personalId,
      full_name: nombre,
      assignment_status: CODIGO_INGLES[datos.estado],
      asignacion
    });
  } catch (error) {
    await cliente.query('ROLLBACK').catch(() => {});
    console.error('Error al cambiar el estado de una asignación (HU-29):', error);
    res.status(500).json({ error: 'Error al cambiar el estado de la asignación' });
  } finally {
    cliente.release();
  }
};

module.exports = { armarAsignacion, listarMeserosDelEvento, listarMeserosDisponibles, asignarMeseros, cambiarEstadoAsignacion };
