/**
 * Pruebas de validación y reglas de negocio para HU-50 ("Editar eventos").
 * Cubre todos los criterios y casos límite de la checklist:
 * 1. Modificación de todos los datos registrados.
 * 2. Validación de 40 a 600 asistentes, fecha de hoy en adelante, duración 3 a 8 horas, y máximo 3 eventos por fecha.
 * 3. Recálculo de cantidades y personal ante cambio de asistentes.
 * 4. Las horas de servicios adicionales no pueden superar la nueva duración del evento (RN-18).
 * 5. Casos límite exactos: 39 y 601 asistentes, fecha pasada, 2 y 9 horas, fecha con 3 eventos existentes.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { validarEdicionEvento } = require('../src/middlewares/validarEvento');
const { calcularMeseros, calcularCocineros } = require('../src/config/reglasPersonal');
const { actualizarEvento } = require('../src/controllers/eventosController');

// Obtener la fecha de hoy y ayer en la zona horaria de Colombia
const obtenerFechaHoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
const obtenerFechaAyer = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
};
const obtenerFechaManana = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
};

const payloadValido = (extras = {}) => ({
  nombre_evento: 'Boda de Ensueño Modificada',
  fecha_evento: obtenerFechaManana(),
  tipo_evento: 'Boda',
  duracion_horas: 5,
  asistentes: 100,
  hora_inicio: '18:00',
  observaciones_generales: 'Ninguna nota especial',
  productos: [
    { producto_id: 1, porcion_por_persona: 200 }
  ],
  servicios_adicionales: [
    { tipo: 'dj', descripcion: 'DJ Profesional', tipo_cobro: 'por_hora', horas: 3, valor_unitario: 80000, cantidad: 1 }
  ],
  ...extras
});

const simularEdicion = (params, body) => {
  let status = 200;
  let respuesta = null;
  let nextLlamado = false;

  const req = { params, body };
  const res = {
    status(codigo) {
      status = codigo;
      return this;
    },
    json(datos) {
      respuesta = datos;
      return this;
    }
  };
  const next = () => {
    nextLlamado = true;
  };

  validarEdicionEvento(req, res, next);
  return { status, respuesta, nextLlamado };
};

test('HU-50: se permite modificar todos los datos válidos del evento', () => {
  const res = simularEdicion({ id: '10' }, payloadValido());
  assert.equal(res.nextLlamado, true);
  assert.equal(res.status, 200);
});

test('HU-50: el id del evento en la ruta debe ser un entero positivo válido', () => {
  for (const malo of ['abc', '0', '-5', '1.5', null, undefined, '', '99999999999999999999999']) {
    const res = simularEdicion({ id: malo }, payloadValido());
    assert.equal(res.nextLlamado, false, `ID malo: ${malo}`);
    assert.equal(res.status, 400);
    assert.match(res.respuesta.detalle, /identificador del evento no es válido/);
  }
  const bueno = simularEdicion({ id: '1' }, payloadValido());
  assert.equal(bueno.nextLlamado, true);
});

test('HU-50 / RN-01: validación de asistentes (40 a 600)', () => {
  // Casos válidos dentro del rango
  for (const cantidad of [40, 50, 100, 300, 599, 600]) {
    const res = simularEdicion({ id: '1' }, payloadValido({ asistentes: cantidad }));
    assert.equal(res.nextLlamado, true, `Asistentes válidos: ${cantidad}`);
  }
});

test('HU-50 / RN-01 · Casos límite de asistentes: 39 y 601 son rechazados', () => {
  const res39 = simularEdicion({ id: '1' }, payloadValido({ asistentes: 39 }));
  assert.equal(res39.nextLlamado, false);
  assert.equal(res39.status, 400);
  assert.equal(res39.respuesta.error, 'Regla de negocio no cumplida (RN-01 / RF-08)');
  assert.match(res39.respuesta.detalle, /rango de 40 a 600 personas/);

  const res601 = simularEdicion({ id: '1' }, payloadValido({ asistentes: 601 }));
  assert.equal(res601.nextLlamado, false);
  assert.equal(res601.status, 400);
  assert.equal(res601.respuesta.error, 'Regla de negocio no cumplida (RN-01 / RF-08)');
  assert.match(res601.respuesta.detalle, /rango de 40 a 600 personas/);

  // Decimales o texto
  for (const raro of [0, -10, 100.5, '100 personas', null, undefined]) {
    const res = simularEdicion({ id: '1' }, payloadValido({ asistentes: raro }));
    assert.equal(res.nextLlamado, false);
    assert.equal(res.status, 400);
  }
});

test('HU-50 / RN-14: validación de fecha de hoy en adelante', () => {
  const hoy = obtenerFechaHoy();
  const manana = obtenerFechaManana();

  const resHoy = simularEdicion({ id: '1' }, payloadValido({ fecha_evento: hoy }));
  assert.equal(resHoy.nextLlamado, true, 'Fecha de hoy es permitida');

  const resManana = simularEdicion({ id: '1' }, payloadValido({ fecha_evento: manana }));
  assert.equal(resManana.nextLlamado, true, 'Fecha futura es permitida');
});

test('HU-50 / RN-14 · Caso límite de fecha: fecha pasada es rechazada', () => {
  const ayer = obtenerFechaAyer();
  const res = simularEdicion({ id: '1' }, payloadValido({ fecha_evento: ayer }));
  assert.equal(res.nextLlamado, false);
  assert.equal(res.status, 400);
  assert.equal(res.respuesta.error, 'Regla de negocio no cumplida (RN-14 / RF-02)');
  assert.match(res.respuesta.detalle, /día actual o posterior/);
});

test('HU-50 / RN-14: duración de 3 a 8 horas', () => {
  for (const duracion of [3, 4, 5, 6, 7, 8]) {
    const res = simularEdicion({ id: '1' }, payloadValido({ duracion_horas: duracion, servicios_adicionales: [] }));
    assert.equal(res.nextLlamado, true, `Duración válida: ${duracion}`);
  }
});

test('HU-50 / RN-14 · Casos límite de duración: 2 y 9 horas son rechazadas', () => {
  const res2 = simularEdicion({ id: '1' }, payloadValido({ duracion_horas: 2 }));
  assert.equal(res2.nextLlamado, false);
  assert.equal(res2.status, 400);
  assert.equal(res2.respuesta.error, 'Duración inválida');
  assert.match(res2.respuesta.detalle, /entre 3 y 8 horas/);

  const res9 = simularEdicion({ id: '1' }, payloadValido({ duracion_horas: 9 }));
  assert.equal(res9.nextLlamado, false);
  assert.equal(res9.status, 400);
  assert.equal(res9.respuesta.error, 'Duración inválida');
  assert.match(res9.respuesta.detalle, /entre 3 y 8 horas/);

  for (const rara of [0, 1, 2.9, 8.1, 12, NaN, 'cuatro horas']) {
    const res = simularEdicion({ id: '1' }, payloadValido({ duracion_horas: rara }));
    assert.equal(res.nextLlamado, false);
    assert.equal(res.status, 400);
  }
});

test('HU-50 / RN-18: las horas de servicios adicionales no pueden superar la nueva duración del evento', () => {
  // Evento editado con duración de 3 horas y servicio de 4 horas -> debe ser rechazado
  const resExcedido = simularEdicion(
    { id: '1' },
    payloadValido({
      duracion_horas: 3,
      servicios_adicionales: [
        { tipo: 'dj', descripcion: 'DJ', tipo_cobro: 'por_hora', horas: 4, valor_unitario: 50000, cantidad: 1 }
      ]
    })
  );
  assert.equal(resExcedido.nextLlamado, false);
  assert.equal(resExcedido.status, 400);
  assert.equal(resExcedido.respuesta.error, 'Regla de negocio no cumplida (RN-18)');
  assert.match(resExcedido.respuesta.detalle, /no puede durar más que el evento/);

  // Mismo evento con servicio de 3 horas (igual a duración) -> permitido
  const resExacto = simularEdicion(
    { id: '1' },
    payloadValido({
      duracion_horas: 3,
      servicios_adicionales: [
        { tipo: 'dj', descripcion: 'DJ', tipo_cobro: 'por_hora', horas: 3, valor_unitario: 50000, cantidad: 1 }
      ]
    })
  );
  assert.equal(resExacto.nextLlamado, true);

  // Evento con duración máxima de 8 horas: un servicio de 6 u 8 horas es permitido (hasta la duración total)
  const res8Horas = simularEdicion(
    { id: '1' },
    payloadValido({
      duracion_horas: 8,
      servicios_adicionales: [
        { tipo: 'dj', descripcion: 'DJ', tipo_cobro: 'por_hora', horas: 8, valor_unitario: 50000, cantidad: 1 }
      ]
    })
  );
  assert.equal(res8Horas.nextLlamado, true);

  const res6Horas = simularEdicion(
    { id: '1' },
    payloadValido({
      duracion_horas: 8,
      servicios_adicionales: [
        { tipo: 'musica_en_vivo', descripcion: 'Banda en vivo', tipo_cobro: 'por_hora', horas: 6, valor_unitario: 120000, cantidad: 1 }
      ]
    })
  );
  assert.equal(res6Horas.nextLlamado, true);

  // Evento de 8 horas con servicio de 8.5 horas -> rechazado
  const res8yMedia = simularEdicion(
    { id: '1' },
    payloadValido({
      duracion_horas: 8,
      servicios_adicionales: [
        { tipo: 'dj', descripcion: 'DJ', tipo_cobro: 'por_hora', horas: 8.5, valor_unitario: 50000, cantidad: 1 }
      ]
    })
  );
  assert.equal(res8yMedia.nextLlamado, false);
  assert.equal(res8yMedia.status, 400);

  // Servicio con menos del mínimo permitido (1 hora), ej. 0.5 horas -> rechazado
  const resMenorMinimo = simularEdicion(
    { id: '1' },
    payloadValido({
      duracion_horas: 8,
      servicios_adicionales: [
        { tipo: 'dj', descripcion: 'DJ', tipo_cobro: 'por_hora', horas: 0.5, valor_unitario: 50000, cantidad: 1 }
      ]
    })
  );
  assert.equal(resMenorMinimo.nextLlamado, false);
  assert.equal(resMenorMinimo.status, 400);
  assert.match(resMenorMinimo.respuesta.detalle, /al menos 1 hora/);

  // Servicios de tarifa fija (por_servicio) no tienen horas y no se ven limitados por la duración
  const resFijo = simularEdicion(
    { id: '1' },
    payloadValido({
      duracion_horas: 3,
      servicios_adicionales: [
        { tipo: 'otro', descripcion: 'Fotógrafo Profesional', tipo_cobro: 'por_servicio', valor_unitario: 200000, cantidad: 1 }
      ]
    })
  );
  assert.equal(resFijo.nextLlamado, true);
});

test('HU-50: recálculo reactivo de personal ante cambio de asistentes', () => {
  // Al cambiar asistentes de 100 a 200:
  // Meseros (1 por cada 20): Math.ceil(100/20) = 5 -> Math.ceil(200/20) = 10
  assert.equal(calcularMeseros(100), 5);
  assert.equal(calcularMeseros(200), 10);

  // Cocineros (2 por cada grupo de 25): Math.ceil(100/25)*2 = 8 -> Math.ceil(200/25)*2 = 16
  assert.equal(calcularCocineros(100), 8);
  assert.equal(calcularCocineros(200), 16);

  // Al cambiar asistentes a 45:
  assert.equal(calcularMeseros(45), 3);
  assert.equal(calcularCocineros(45), 4);
});

test('HU-50 / RN-13 · Caso límite de fecha con 3 eventos existentes', async () => {
  let status = 200;
  let jsonRespuesta = null;
  const res = {
    status(c) { status = c; return this; },
    json(d) { jsonRespuesta = d; return this; }
  };

  const pool = require('../src/config/db');
  const originalConnect = pool.connect;

  try {
    // Escenario A: la fecha de destino ya tiene 3 eventos que no son el actual (total >= 3)
    pool.connect = async () => ({
      query: async (sql, params) => {
        if (sql.includes('SELECT * FROM eventos WHERE id = $1')) {
          return { rows: [{ id: 10, nombre_evento: 'Evento Actual', fecha_evento: '2026-12-01' }] };
        }
        if (sql.includes('SELECT COUNT(*)::int AS total')) {
          return { rows: [{ total: 3 }] }; // Ya hay 3 otros eventos
        }
        return { rows: [] };
      },
      release: () => {}
    });

    await actualizarEvento(
      { params: { id: '10' }, body: payloadValido({ fecha_evento: '2026-12-01' }) },
      res
    );

    assert.equal(status, 400);
    assert.equal(jsonRespuesta.error, 'Regla de negocio no cumplida (RN-13 / RF-51)');
    assert.match(jsonRespuesta.detalle, /Ya existen 3 eventos programados/);

    // Escenario B: el evento actual ya estaba en esa fecha y hay 2 otros (total = 2 excluyéndolo)
    pool.connect = async () => ({
      query: async (sql, params) => {
        if (sql.includes('SELECT * FROM eventos WHERE id = $1')) {
          return { rows: [{ id: 10, nombre_evento: 'Evento Actual', fecha_evento: '2026-12-01' }] };
        }
        if (sql.includes('SELECT COUNT(*)::int AS total')) {
          return { rows: [{ total: 2 }] }; // 2 otros eventos + este mismo = 3 total, permitido editar
        }
        if (sql.includes('UPDATE eventos')) {
          return { rows: [{ id: 10, ...payloadValido(), hora_inicio: '18:00:00' }] };
        }
        if (sql.includes('SELECT * FROM catalogo_productos')) {
          return { rows: [{ id: 1, nombre: 'Carne', tipo_calculo: 'porcion_persona', precio_unitario: '5000', porcion_por_persona: '200', unidad_medida: 'g' }] };
        }
        return { rows: [] };
      },
      release: () => {}
    });

    await actualizarEvento(
      { params: { id: '10' }, body: payloadValido({ fecha_evento: '2026-12-01' }) },
      res
    );

    assert.equal(status, 200);
    assert.equal(jsonRespuesta.mensaje, 'Evento actualizado exitosamente');
    assert.equal(jsonRespuesta.evento.id, 10);
  } finally {
    pool.connect = originalConnect;
  }
});
