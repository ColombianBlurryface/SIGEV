/**
 * Pruebas de validación y reglas de negocio para HU-51 ("Cambiar el estado del evento").
 * Cubre todos los criterios y casos de la checklist:
 * 1. El estado se elige entre Planificación, Confirmado, Realizado y Cancelado.
 * 2. El cambio se hace desde la interfaz, sin tocar la base de datos (API REST PATCH /api/eventos/:id/estado).
 * 3. El estado nuevo queda guardado y se ve al consultar el evento.
 * 4. Un evento Cancelado puede volver a Planificación.
 * 5. Un evento Realizado ya no puede cambiar a ningún otro estado (probar Realizado -> Planificación, Confirmado y Cancelado).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ESTADOS_EVENTO,
  ETIQUETAS_ESTADO,
  normalizarEstadoEvento,
  validarTransicionEstado
} = require('../src/config/reglasEvento');
const { cambiarEstadoEvento } = require('../src/controllers/eventosController');
const pool = require('../src/config/db');

test('HU-51 / RF-58: Estados definidos y etiquetas de estado', () => {
  assert.deepEqual(ESTADOS_EVENTO, ['planificacion', 'confirmado', 'realizado', 'cancelado']);
  assert.equal(ETIQUETAS_ESTADO.planificacion, 'Planificación');
  assert.equal(ETIQUETAS_ESTADO.confirmado, 'Confirmado');
  assert.equal(ETIQUETAS_ESTADO.realizado, 'Realizado');
  assert.equal(ETIQUETAS_ESTADO.cancelado, 'Cancelado');
});

test('HU-51 / RF-58 · Criterio 1: normalización de estados permitidos y rechazo de inválidos', () => {
  // Acepta con y sin tildes, mayúsculas y espacios
  assert.equal(normalizarEstadoEvento('planificacion'), 'planificacion');
  assert.equal(normalizarEstadoEvento('Planificación'), 'planificacion');
  assert.equal(normalizarEstadoEvento('PLANIFICACION'), 'planificacion');
  assert.equal(normalizarEstadoEvento('  Planificación  '), 'planificacion');

  assert.equal(normalizarEstadoEvento('confirmado'), 'confirmado');
  assert.equal(normalizarEstadoEvento('Confirmado'), 'confirmado');
  assert.equal(normalizarEstadoEvento('CONFIRMADO'), 'confirmado');

  assert.equal(normalizarEstadoEvento('realizado'), 'realizado');
  assert.equal(normalizarEstadoEvento('Realizado'), 'realizado');
  assert.equal(normalizarEstadoEvento('REALIZADO'), 'realizado');

  assert.equal(normalizarEstadoEvento('cancelado'), 'cancelado');
  assert.equal(normalizarEstadoEvento('Cancelado'), 'cancelado');
  assert.equal(normalizarEstadoEvento('CANCELADO'), 'cancelado');

  // Valores inválidos
  for (const invalido of ['en_progreso', 'borrador', 'pendiente', 'terminado', 'otro', '', '   ', null, undefined, 123, true, {}]) {
    assert.equal(normalizarEstadoEvento(invalido), null, `Debe rechazar: ${invalido}`);
  }
});

test('HU-51 / RF-58: transiciones desde Planificación y Confirmado', () => {
  // Desde Planificación se puede pasar a Confirmado, Realizado o Cancelado
  assert.equal(validarTransicionEstado('planificacion', 'planificacion').valido, true);
  assert.equal(validarTransicionEstado('planificacion', 'confirmado').valido, true);
  assert.equal(validarTransicionEstado('planificacion', 'realizado').valido, true);
  assert.equal(validarTransicionEstado('planificacion', 'cancelado').valido, true);

  // Desde Confirmado se puede pasar a Planificación, Realizado o Cancelado
  assert.equal(validarTransicionEstado('confirmado', 'confirmado').valido, true);
  assert.equal(validarTransicionEstado('confirmado', 'planificacion').valido, true);
  assert.equal(validarTransicionEstado('confirmado', 'realizado').valido, true);
  assert.equal(validarTransicionEstado('confirmado', 'cancelado').valido, true);
});

test('HU-51 / RF-58 · Criterio 4: un evento Cancelado puede volver a Planificación', () => {
  const transicionAPlanificacion = validarTransicionEstado('cancelado', 'planificacion');
  assert.equal(transicionAPlanificacion.valido, true);

  // Permanecer en cancelado es válido
  assert.equal(validarTransicionEstado('cancelado', 'cancelado').valido, true);

  // De cancelado NO puede pasar directo a Confirmado o Realizado (debe volver a Planificación)
  const aConfirmado = validarTransicionEstado('cancelado', 'confirmado');
  assert.equal(aConfirmado.valido, false);
  assert.match(aConfirmado.detalle, /solo puede volver al estado de Planificación/);

  const aRealizado = validarTransicionEstado('cancelado', 'realizado');
  assert.equal(aRealizado.valido, false);
  assert.match(aRealizado.detalle, /solo puede volver al estado de Planificación/);
});

test('HU-51 / RF-58 · Criterio 5: un evento Realizado ya no puede cambiar a ningún otro estado (probar Realizado -> Planificación, Confirmado y Cancelado)', () => {
  // 1. Probar Realizado -> Planificación
  const aPlanificacion = validarTransicionEstado('realizado', 'planificacion');
  assert.equal(aPlanificacion.valido, false);
  assert.equal(aPlanificacion.error, 'Regla de negocio no cumplida (RF-58)');
  assert.match(aPlanificacion.detalle, /ya no puede cambiar a ningún otro estado/);

  // 2. Probar Realizado -> Confirmado
  const aConfirmado = validarTransicionEstado('realizado', 'confirmado');
  assert.equal(aConfirmado.valido, false);
  assert.equal(aConfirmado.error, 'Regla de negocio no cumplida (RF-58)');
  assert.match(aConfirmado.detalle, /ya no puede cambiar a ningún otro estado/);

  // 3. Probar Realizado -> Cancelado
  const aCancelado = validarTransicionEstado('realizado', 'cancelado');
  assert.equal(aCancelado.valido, false);
  assert.equal(aCancelado.error, 'Regla de negocio no cumplida (RF-58)');
  assert.match(aCancelado.detalle, /ya no puede cambiar a ningún otro estado/);

  // Mantenerse en realizado es válido
  assert.equal(validarTransicionEstado('realizado', 'realizado').valido, true);
});

test('HU-51: controlador rechaza identificadores de evento inválidos', async () => {
  for (const malo of ['abc', '0', '-5', '1.5', null, undefined, '', '99999999999999999999999']) {
    let status = 200;
    let respuesta = null;
    const req = { params: { id: malo }, body: { estado: 'confirmado' } };
    const res = {
      status(c) { status = c; return this; },
      json(d) { respuesta = d; return this; }
    };
    await cambiarEstadoEvento(req, res);
    assert.equal(status, 400, `ID malo: ${malo}`);
    assert.match(respuesta.detalle, /identificador del evento no es válido/);
  }
});

test('HU-51: controlador rechaza estados no enviados o inválidos', async () => {
  for (const malo of [undefined, null, '', '   ', 'en_progreso', 'otro', 123]) {
    let status = 200;
    let respuesta = null;
    const req = { params: { id: '1' }, body: { estado: malo } };
    const res = {
      status(c) { status = c; return this; },
      json(d) { respuesta = d; return this; }
    };
    await cambiarEstadoEvento(req, res);
    assert.equal(status, 400);
    assert.match(respuesta.detalle, /El estado/);
  }
});

test('HU-51 · Casos del controlador con simulación de BD', async () => {
  const originalConnect = pool.connect;

  try {
    // 1. Evento no encontrado (404)
    pool.connect = async () => ({
      query: async (sql) => {
        if (sql.startsWith('SELECT * FROM eventos')) return { rows: [] };
        return { rows: [] };
      },
      release: () => {}
    });

    let status = 200;
    let respuesta = null;
    await cambiarEstadoEvento(
      { params: { id: '9999' }, body: { estado: 'confirmado' } },
      {
        status(c) { status = c; return this; },
        json(d) { respuesta = d; return this; }
      }
    );
    assert.equal(status, 404);
    assert.equal(respuesta.error, 'Evento no encontrado');

    // 2. Evento Realizado que intenta cambiar de estado -> 400 (Checklist punto 5)
    pool.connect = async () => ({
      query: async (sql) => {
        if (sql.startsWith('SELECT * FROM eventos')) {
          return {
            rows: [{ id: 5, estado: 'realizado', fecha_evento: '2026-12-01', nombre_evento: 'Boda Terminada' }]
          };
        }
        return { rows: [] };
      },
      release: () => {}
    });

    for (const intento of ['planificacion', 'confirmado', 'cancelado']) {
      await cambiarEstadoEvento(
        { params: { id: '5' }, body: { estado: intento } },
        {
          status(c) { status = c; return this; },
          json(d) { respuesta = d; return this; }
        }
      );
      assert.equal(status, 400, `Intento Realizado -> ${intento}`);
      assert.equal(respuesta.error, 'Regla de negocio no cumplida (RF-58)');
      assert.match(respuesta.detalle, /ya no puede cambiar a ningún otro estado/);
    }

    // 3. Evento Cancelado que intenta cambiar a Confirmado o Realizado -> 400
    pool.connect = async () => ({
      query: async (sql) => {
        if (sql.startsWith('SELECT * FROM eventos')) {
          return {
            rows: [{ id: 6, estado: 'cancelado', fecha_evento: '2026-12-01', nombre_evento: 'Boda Cancelada' }]
          };
        }
        return { rows: [] };
      },
      release: () => {}
    });

    for (const intento of ['confirmado', 'realizado']) {
      await cambiarEstadoEvento(
        { params: { id: '6' }, body: { estado: intento } },
        {
          status(c) { status = c; return this; },
          json(d) { respuesta = d; return this; }
        }
      );
      assert.equal(status, 400, `Intento Cancelado -> ${intento}`);
      assert.equal(respuesta.error, 'Regla de negocio no cumplida (RF-58)');
      assert.match(respuesta.detalle, /solo puede volver al estado de Planificación/);
    }

    // 4. Evento Cancelado que vuelve a Planificación (Checklist punto 4)
    let updateEjecutado = false;
    pool.connect = async () => ({
      query: async (sql, params) => {
        if (sql.startsWith('SELECT * FROM eventos')) {
          return {
            rows: [{ id: 6, estado: 'cancelado', fecha_evento: '2026-12-01', nombre_evento: 'Boda Cancelada' }]
          };
        }
        if (sql.includes('SELECT COUNT(*)::int AS total')) {
          return { rows: [{ total: 1 }] }; // Solo 1 evento activo en la fecha (cabe sin violar RN-13)
        }
        if (sql.startsWith('UPDATE eventos')) {
          updateEjecutado = true;
          return {
            rows: [{
              id: 6,
              nombre_evento: 'Boda Cancelada',
              fecha_evento: '2026-12-01',
              tipo_evento: 'Boda',
              duracion_horas: '5.00',
              asistentes: 100,
              estado: 'planificacion',
              hora_inicio: '18:00:00'
            }]
          };
        }
        return { rows: [] };
      },
      release: () => {}
    });

    await cambiarEstadoEvento(
      { params: { id: '6' }, body: { estado: 'Planificación' } },
      {
        status(c) { status = c; return this; },
        json(d) { respuesta = d; return this; }
      }
    );
    assert.equal(status, 200);
    assert.equal(updateEjecutado, true);
    assert.equal(respuesta.evento.estado, 'planificacion');
    assert.match(respuesta.mensaje, /exitosamente/);

    // 5. Reactivar evento cancelado pero la fecha ya tiene 3 eventos activos -> 400 (RN-13)
    pool.connect = async () => ({
      query: async (sql) => {
        if (sql.startsWith('SELECT * FROM eventos')) {
          return {
            rows: [{ id: 6, estado: 'cancelado', fecha_evento: '2026-12-01', nombre_evento: 'Boda Cancelada' }]
          };
        }
        if (sql.includes('SELECT COUNT(*)::int AS total')) {
          return { rows: [{ total: 3 }] }; // Ya hay 3 eventos activos en la fecha
        }
        return { rows: [] };
      },
      release: () => {}
    });

    await cambiarEstadoEvento(
      { params: { id: '6' }, body: { estado: 'planificacion' } },
      {
        status(c) { status = c; return this; },
        json(d) { respuesta = d; return this; }
      }
    );
    assert.equal(status, 400);
    assert.equal(respuesta.error, 'Regla de negocio no cumplida (RN-13 / RF-51)');
    assert.match(respuesta.detalle, /ya existen 3 eventos programados/);

  } finally {
    pool.connect = originalConnect;
  }
});
