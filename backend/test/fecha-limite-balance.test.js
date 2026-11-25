/**
 * Pruebas de HU-33 · Establecer fechas límite (RF-42).
 *
 * El balance logístico se guarda en `evento_balance_recursos` y cada recurso tiene un `id` estable, así que la fecha límite
 * vive en la columna `fecha_limite` de esa misma fila. Aquí se prueba con una conexión falsa a la base:
 * - Escenario 1: fijar la fecha y verla en el balance.
 * - Escenario 2: una fecha posterior a la del evento se rechaza con 400.
 * - Escenario 3: cambiar la fecha sobrescribe la anterior (un solo UPDATE, ningún INSERT).
 * - Quitar la fecha con null, ids inválidos, recurso de otro evento, y que la sincronización del balance no borre la fecha.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  establecerFechaLimiteRecurso,
  estructurarRespuestaBalance,
  sincronizarTablaBalance,
  aFechaIso,
  esFechaIsoValida
} = require('../src/controllers/balanceController');
const pool = require('../src/config/db');

// Un recurso del evento 10 (que es el 20 de octubre de 2026), con la fecha límite que se le pida
const filaRecurso = (fecha) => ({
  id: 5,
  evento_id: 10,
  categoria: 'mobiliario',
  recurso_nombre: 'Sillas Tiffany',
  origen_tipo: 'producto_catalogo',
  origen_id: 123,
  cantidad_requerida: 100,
  cantidad_disponible: 40,
  unidad_medida: 'unidades',
  estado: 'por_conseguir',
  fecha_limite: fecha,
  notas: null
});

/**
 * Conexión falsa: recuerda las consultas que recibe y responde como la base.
 * `recursoExiste` en false simula un recurso que no es de este evento (o que no existe).
 */
const conexionFalsa = ({ fechaEvento = '2026-10-20', recursoExiste = true, fechaGuardada = null } = {}) => {
  const consultas = [];
  let fechaActual = fechaGuardada;
  const cliente = {
    query: async (sql, params) => {
      consultas.push({ sql, params });
      if (sql.includes('FROM evento_balance_recursos r') && sql.includes('JOIN eventos')) {
        return { rows: recursoExiste ? [{ id: 5, fecha_evento: fechaEvento }] : [] };
      }
      if (sql.includes('UPDATE evento_balance_recursos')) {
        fechaActual = params[0];
        return { rows: [] };
      }
      if (sql.includes('FROM eventos WHERE id')) {
        return { rows: [{ id: 10, nombre_evento: 'Boda', asistentes: 100, fecha_evento: fechaEvento }] };
      }
      if (sql.includes('SELECT * FROM evento_balance_recursos')) {
        return { rows: [filaRecurso(fechaActual)] };
      }
      return { rows: [] };
    },
    release: () => {}
  };
  return { cliente, consultas };
};

// Ejecuta el controlador con la conexión falsa y devuelve lo que respondió
const pedir = async (params, body, opciones) => {
  const { cliente, consultas } = conexionFalsa(opciones);
  const original = pool.connect;
  pool.connect = async () => cliente;
  try {
    let status = null;
    let cuerpo = null;
    const res = {
      status: (codigo) => { status = codigo; return { json: (d) => { cuerpo = d; } }; },
      json: (d) => { status = 200; cuerpo = d; }
    };
    await establecerFechaLimiteRecurso({ params, body }, res);
    return { status, cuerpo, consultas };
  } finally {
    pool.connect = original;
  }
};

const PARAMS = { id: '10', recursoId: '5' };
const haceUpdate = (consultas) => consultas.filter((c) => c.sql.includes('UPDATE evento_balance_recursos'));

test('HU-33: aFechaIso convierte lo que entrega la base (Date o texto) a AAAA-MM-DD, sin importar la zona horaria', () => {
  // El driver entrega los DATE como Date a medianoche local: el día no debe correrse
  assert.equal(aFechaIso(new Date(2026, 9, 15)), '2026-10-15');
  assert.equal(aFechaIso(new Date(2026, 0, 1)), '2026-01-01');
  assert.equal(aFechaIso('2026-10-15'), '2026-10-15');
  assert.equal(aFechaIso('2026-10-15T00:00:00.000Z'), '2026-10-15');
  assert.equal(aFechaIso(null), null);
  assert.equal(aFechaIso(''), null);
  assert.equal(aFechaIso('no es fecha'), null);
  assert.equal(aFechaIso(new Date('basura')), null);
});

test('HU-33: esFechaIsoValida solo acepta días reales en formato AAAA-MM-DD', () => {
  for (const valida of ['2026-10-15', '2028-02-29', '2026-12-31']) assert.equal(esFechaIsoValida(valida), true, valida);
  for (const invalida of ['2026-02-30', '2027-02-29', '2026-13-01', '2026-00-10', '15/10/2026', '2026-1-5', '2026-10-15T00:00', 20261015, null, undefined]) {
    assert.equal(esFechaIsoValida(invalida), false, String(invalida));
  }
});

test('HU-33 / RF-42: el balance muestra la fecha límite junto a cada ítem, con item_id estable (y null si no tiene)', () => {
  const filas = [filaRecurso(new Date(2026, 9, 15)), { ...filaRecurso(null), id: 6, recurso_nombre: 'Mesas' }];
  const balance = estructurarRespuestaBalance(10, filas, { id: 10, nombre_evento: 'Boda', asistentes: 100, fecha_evento: '2026-10-20' });

  // Contrato oficial: items por categoría
  const items = balance.categories.find((c) => c.category_name === 'FURNITURE').items;
  assert.deepEqual(items.map((i) => [i.item_id, i.item_name, i.deadline_date]), [
    ['5', 'Sillas Tiffany', '2026-10-15'],
    ['6', 'Mesas', null]
  ]);
  // Lista que usa la pantalla
  assert.equal(balance.recursos[0].fecha_limite, '2026-10-15');
  assert.equal(balance.recursos[0].deadline_date, '2026-10-15');
  assert.equal(balance.recursos[1].fecha_limite, null);
  // La pantalla necesita la fecha del evento para no ofrecer días posteriores
  assert.equal(balance.fecha_evento, '2026-10-20');
  assert.equal(balance.event_date, '2026-10-20');
});

test('HU-33 / Escenario 1: asigna la fecha límite y el balance la muestra enseguida', async () => {
  const { status, cuerpo, consultas } = await pedir(PARAMS, { deadline_date: '2026-10-15' });

  assert.equal(status, 200);
  assert.equal(cuerpo.event_id, '10');
  assert.equal(cuerpo.item_id, '5');
  assert.equal(cuerpo.deadline_date, '2026-10-15');
  assert.equal(cuerpo.message, 'Fecha límite actualizada correctamente.');
  assert.deepEqual(haceUpdate(consultas)[0].params, ['2026-10-15', 5, 10], 'guarda en el recurso 5 del evento 10');
  const sillas = cuerpo.balance.recursos.find((r) => r.id === 5);
  assert.equal(sillas.fecha_limite, '2026-10-15', 'el balance devuelto ya trae la fecha');
});

test('HU-33 / Escenario 2: una fecha posterior a la del evento se rechaza con 400 y no se guarda nada', async () => {
  const { status, cuerpo, consultas } = await pedir(PARAMS, { deadline_date: '2026-10-25' }, { fechaEvento: '2026-10-20' });

  assert.equal(status, 400);
  assert.match(cuerpo.detalle, /no puede ser posterior a la fecha del evento/);
  assert.match(cuerpo.detalle, /20\/10\/2026/, 'dice cuál es la fecha del evento');
  assert.equal(haceUpdate(consultas).length, 0, 'no escribió en la base');
});

test('HU-33 / RF-42: el mismo día del evento sí se permite, y un día antes también', async () => {
  for (const fecha of ['2026-10-20', '2026-10-19']) {
    const { status, cuerpo } = await pedir(PARAMS, { deadline_date: fecha }, { fechaEvento: '2026-10-20' });
    assert.equal(status, 200, fecha);
    assert.equal(cuerpo.deadline_date, fecha);
  }
});

test('HU-33 / Escenario 3: cambiar la fecha sobrescribe la anterior, no crea otro registro', async () => {
  const { status, cuerpo, consultas } = await pedir(PARAMS, { deadline_date: '2026-10-12' }, { fechaGuardada: '2026-10-10' });

  assert.equal(status, 200);
  assert.equal(haceUpdate(consultas).length, 1, 'un solo UPDATE sobre la fila existente');
  assert.equal(consultas.filter((c) => /INSERT/i.test(c.sql)).length, 0, 'ningún INSERT: no se duplica');
  assert.equal(cuerpo.balance.recursos.find((r) => r.id === 5).fecha_limite, '2026-10-12', 'el balance refleja la nueva fecha');
});

test('HU-33 / RF-42: con deadline_date null (o vacío) se borra la fecha límite', async () => {
  for (const vacio of [null, '']) {
    const { status, cuerpo, consultas } = await pedir(PARAMS, { deadline_date: vacio }, { fechaGuardada: '2026-10-10' });
    assert.equal(status, 200);
    assert.equal(cuerpo.deadline_date, null);
    assert.equal(cuerpo.message, 'Fecha límite eliminada correctamente.');
    assert.deepEqual(haceUpdate(consultas)[0].params, [null, 5, 10]);
    assert.equal(cuerpo.balance.recursos[0].fecha_limite, null);
  }
});

test('HU-33: también acepta el nombre en español (fecha_limite)', async () => {
  const { status, cuerpo } = await pedir(PARAMS, { fecha_limite: '2026-10-15' });
  assert.equal(status, 200);
  assert.equal(cuerpo.deadline_date, '2026-10-15');
});

test('HU-33: la ruta en inglés del contrato usa eventId e itemId', async () => {
  const { status, cuerpo } = await pedir({ eventId: '10', itemId: '5' }, { deadline_date: '2026-10-15' });
  assert.equal(status, 200);
  assert.equal(cuerpo.item_id, '5');
});

test('HU-33: rechaza con 400 un cuerpo sin fecha, con otro formato, con un día que no existe o que no es texto', async () => {
  const casos = [
    [{}, /Falta la fecha límite/],
    [undefined, /Falta la fecha límite/],
    [{ deadline_date: '15/10/2026' }, /formato AAAA-MM-DD/],
    [{ deadline_date: '2026-02-30' }, /formato AAAA-MM-DD/],
    [{ deadline_date: '2026-10-15T10:00:00' }, /formato AAAA-MM-DD/],
    [{ deadline_date: 20261015 }, /formato AAAA-MM-DD/],
    [{ deadline_date: ['2026-10-15'] }, /formato AAAA-MM-DD/]
  ];
  for (const [cuerpoPeticion, patron] of casos) {
    const { status, cuerpo, consultas } = await pedir(PARAMS, cuerpoPeticion);
    assert.equal(status, 400, JSON.stringify(cuerpoPeticion));
    assert.match(cuerpo.detalle, patron);
    assert.equal(haceUpdate(consultas).length, 0);
  }
});

test('HU-33: rechaza con 400 un id de evento o de recurso que no es válido', async () => {
  for (const params of [{ id: 'abc', recursoId: '5' }, { id: '10', recursoId: 'itm-chair-001' }, { id: '10', recursoId: '0' }, { id: '10', recursoId: '-3' }, { id: '10', recursoId: '1.5' }]) {
    const { status, consultas } = await pedir(params, { deadline_date: '2026-10-15' });
    assert.equal(status, 400, JSON.stringify(params));
    assert.equal(consultas.length, 0, 'ni siquiera consulta la base');
  }
});

test('HU-33: un recurso que no existe o es de otro evento responde 404 y no se modifica', async () => {
  const { status, cuerpo, consultas } = await pedir(PARAMS, { deadline_date: '2026-10-15' }, { recursoExiste: false });
  assert.equal(status, 404);
  assert.equal(cuerpo.error, 'Recurso no encontrado');
  assert.equal(haceUpdate(consultas).length, 0);
  // La búsqueda se hace por recurso Y evento: así un id de otro evento nunca se modifica
  assert.deepEqual(consultas[0].params, [5, 10]);
});

test('HU-33 / RF-42: sincronizar el balance conserva la fecha límite que el usuario ya puso', async () => {
  let sqlUpdate = null;
  const cliente = {
    query: async (sql) => {
      if (sql.includes('SELECT * FROM evento_balance_recursos WHERE evento_id = $1')) {
        return { rows: [{ ...filaRecurso('2026-10-15'), estado_manual: false }] };
      }
      if (sql.includes('UPDATE evento_balance_recursos')) {
        sqlUpdate = sql;
        return { rows: [] };
      }
      return { rows: [] };
    }
  };

  await sincronizarTablaBalance(cliente, 10, [
    { categoria: 'mobiliario', recurso_nombre: 'Sillas Tiffany', origen_tipo: 'producto_catalogo', origen_id: 123, cantidad_requerida: 120, cantidad_disponible: 40, unidad_medida: 'unidades', estado: 'por_conseguir', notas: null }
  ]);

  assert.ok(sqlUpdate, 'actualizó las cantidades del recurso');
  assert.doesNotMatch(sqlUpdate, /fecha_limite/, 'el UPDATE de la sincronización no toca la fecha límite');
});
