/**
 * Pruebas de HU-34 · Actualizar el estado de un recurso (RF-43).
 *
 * Se usa una base falsa que guarda lo que se le escribe, para probar de punta a punta lo que pide el ticket:
 * - Escenario 1: marcar un recurso como AVAILABLE y que al consultar el balance siga disponible y sin déficit.
 * - Escenario 2: los campos de dinero (cost, price, invoice_number…) se ignoran por completo: no se leen ni se guardan.
 * - Escenario 3: volver a PENDING deshace la marca y el balance recalcula el déficit real.
 * - La marca sobrevive a «Sincronizar», y se suelta sola si cambia lo que el evento requiere.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  cambiarEstadoRecursoBalance,
  obtenerBalanceEvento,
  sincronizarBalanceEvento,
  estructurarRespuestaBalance
} = require('../src/controllers/balanceController');
const eventosRoutes = require('../src/routes/eventosRoutes');
const pool = require('../src/config/db');

/**
 * Base falsa con un evento de 100 asistentes (requiere 5 meseros y 8 cocineros, y no hay nadie asignado, así que ambos
 * recursos están en déficit). Entiende las consultas del controlador del balance y recuerda los cambios.
 */
const baseFalsa = ({ asistentes = 100 } = {}) => {
  const estado = { asistentes };
  const filas = [
    { id: 1, evento_id: 10, categoria: 'personal', recurso_nombre: 'Meseros', origen_tipo: 'personal', origen_id: null, cantidad_requerida: 5, cantidad_disponible: 0, unidad_medida: 'personas', estado: 'por_conseguir', estado_manual: false, fecha_limite: null, notas: 'x' },
    { id: 2, evento_id: 10, categoria: 'personal', recurso_nombre: 'Cocineros', origen_tipo: 'personal', origen_id: null, cantidad_requerida: 8, cantidad_disponible: 0, unidad_medida: 'personas', estado: 'por_conseguir', estado_manual: false, fecha_limite: null, notas: 'x' }
  ];
  const consultas = [];
  const cliente = {
    query: async (sql, params) => {
      consultas.push({ sql, params });
      // Cambio manual de estado (la consulta del controlador de HU-34)
      if (sql.includes('SET estado = $1') && sql.includes('estado_manual = $2')) {
        const fila = filas.find((f) => f.id === params[2] && f.evento_id === params[3]);
        if (!fila) return { rows: [] };
        fila.estado = params[0];
        fila.estado_manual = params[1];
        return { rows: [{ ...fila }] };
      }
      // Sincronización del balance (la consulta de HU-31 que actualiza cantidades y estado)
      if (sql.includes('UPDATE evento_balance_recursos') && sql.includes('recurso_nombre = $1')) {
        const fila = filas.find((f) => f.id === params[7]);
        Object.assign(fila, { cantidad_requerida: params[1], cantidad_disponible: params[2], estado: params[4], estado_manual: params[5] });
        return { rows: [] };
      }
      if (sql.includes('FROM eventos WHERE id')) {
        return { rows: [{ id: 10, nombre_evento: 'Boda', asistentes: estado.asistentes, duracion_horas: 5, estado: 'planificacion', fecha_evento: '2026-10-20' }] };
      }
      if (sql.includes('SELECT * FROM evento_balance_recursos')) return { rows: filas.map((f) => ({ ...f })) };
      return { rows: [] };
    },
    release: () => {}
  };
  return { cliente, filas, consultas, estado };
};

// Ejecuta un controlador con la base falsa y devuelve lo que respondió
const ejecutar = async (controlador, base, req) => {
  const original = pool.connect;
  pool.connect = async () => base.cliente;
  try {
    let status = null;
    let cuerpo = null;
    const res = {
      status: (codigo) => { status = codigo; return { json: (d) => { cuerpo = d; } }; },
      json: (d) => { status = 200; cuerpo = d; }
    };
    await controlador(req, res);
    return { status, cuerpo };
  } finally {
    pool.connect = original;
  }
};

const cambiar = (base, body, params = { id: '10', recursoId: '1' }) => ejecutar(cambiarEstadoRecursoBalance, base, { params, body });
const consultar = (base) => ejecutar(obtenerBalanceEvento, base, { params: { id: '10' } });
const meserosDe = (balance) => balance.recursos.find((r) => r.recurso_nombre === 'Meseros');
const cocinerosDe = (balance) => balance.recursos.find((r) => r.recurso_nombre === 'Cocineros');

test('HU-34 / Escenario 1: marcar un recurso como AVAILABLE lo deja disponible y sin déficit, también al consultar de nuevo el balance', async () => {
  const base = baseFalsa();
  const antes = await consultar(base);
  assert.equal(meserosDe(antes.cuerpo).deficit_quantity, 5, 'antes: 5 meseros de déficit');
  assert.equal(meserosDe(antes.cuerpo).status, 'TO_PROCURE');

  const r = await cambiar(base, { status: 'AVAILABLE' });
  assert.equal(r.status, 200);
  assert.equal(r.cuerpo.event_id, '10');
  assert.equal(r.cuerpo.item_id, '1');
  assert.equal(r.cuerpo.status, 'AVAILABLE');
  assert.equal(r.cuerpo.message, 'Estado del recurso actualizado correctamente.');

  for (const balance of [r.cuerpo.balance, (await consultar(base)).cuerpo]) {
    const meseros = meserosDe(balance);
    assert.equal(meseros.status, 'AVAILABLE');
    assert.equal(meseros.deficit_quantity, 0, 'el déficit desaparece');
    assert.equal(meseros.available_quantity, meseros.required_quantity, 'disponible = requerido');
    assert.equal(meseros.is_manually_fulfilled, true);
    // El contrato oficial por categorías cuenta lo mismo
    const item = balance.categories.find((c) => c.category_name === 'STAFF').items.find((i) => i.item_name === 'Meseros');
    assert.deepEqual([item.status, item.deficit_quantity, item.available_quantity], ['AVAILABLE', 0, 5]);
    // Y solo cambia ese recurso
    assert.equal(cocinerosDe(balance).deficit_quantity, 8);
    assert.equal(cocinerosDe(balance).is_manually_fulfilled, false);
  }
});

test('HU-34: lo marcado a mano se guarda como estado manual, y el resumen del balance lo cuenta como listo', async () => {
  const base = baseFalsa();
  await cambiar(base, { status: 'AVAILABLE' });
  assert.equal(base.filas[0].estado, 'disponible');
  assert.equal(base.filas[0].estado_manual, true);
  assert.equal(base.filas[0].cantidad_disponible, 0, 'lo calculado de verdad no se pisa: el «disponible» es solo de presentación');
  const { resumen } = (await consultar(base)).cuerpo;
  assert.equal(resumen.disponibles, 1);
});

test('HU-34 / Escenario 2: los campos de dinero (cost, price, invoice_number…) se ignoran y no se guardan', async () => {
  const base = baseFalsa();
  const r = await cambiar(base, { status: 'AVAILABLE', cost: 50000, price: 1000, invoice_number: 'A-123', factura: 'F-9', comprobante: 'C-1', gasto: 7 });

  assert.equal(r.status, 200, 'solo se procesa el cambio de estado');
  assert.equal(r.cuerpo.status, 'AVAILABLE');
  const escritura = base.consultas.find((c) => c.sql.includes('estado_manual = $2'));
  assert.deepEqual(escritura.params, ['disponible', true, 1, 10], 'se escribe únicamente estado, marca, recurso y evento');
  const todoSql = base.consultas.map((c) => c.sql).join('\n');
  assert.doesNotMatch(todoSql, /cost|price|precio|invoice|factura|comprobante|gasto/i, 'ninguna consulta toca datos contables');
  const respuesta = JSON.stringify(r.cuerpo);
  assert.doesNotMatch(respuesta, /50000|A-123|F-9|C-1|invoice|comprobante/, 'la respuesta no devuelve nada de lo inyectado');
  assert.equal(base.filas[0].cost, undefined, 'la fila no recibió campos nuevos');
});

test('HU-34 / Escenario 3: volver a PENDING deshace la marca manual y el balance recalcula el déficit real', async () => {
  const base = baseFalsa();
  await cambiar(base, { status: 'AVAILABLE' });
  assert.equal(base.filas[0].estado_manual, true);

  const r = await cambiar(base, { status: 'PENDING' });
  assert.equal(r.status, 200);
  assert.equal(base.filas[0].estado_manual, false, 'la marca manual se deshizo');

  const meseros = meserosDe(r.cuerpo.balance);
  assert.equal(meseros.deficit_quantity, 5, 'vuelve el déficit real');
  assert.equal(meseros.available_quantity, 0);
  assert.equal(meseros.is_manually_fulfilled, false);
  assert.equal(meseros.status, 'TO_PROCURE', 'y su estado real (faltan meseros por conseguir), no un «pendiente» fijo');
  assert.equal(r.cuerpo.status, 'TO_PROCURE');
  assert.equal(meserosDe((await consultar(base)).cuerpo).deficit_quantity, 5, 'y se mantiene al consultar de nuevo');
});

test('HU-34: «Sincronizar» no borra lo marcado a mano', async () => {
  const base = baseFalsa();
  await cambiar(base, { status: 'AVAILABLE' });
  const r = await ejecutar(sincronizarBalanceEvento, base, { params: { id: '10' } });
  assert.equal(r.status, 200);
  assert.equal(meserosDe(r.cuerpo).status, 'AVAILABLE');
  assert.equal(meserosDe(r.cuerpo).deficit_quantity, 0);
  assert.equal(base.filas[0].estado_manual, true);
});

test('HU-34: si cambia lo que el evento requiere (más asistentes), la confirmación manual ya no aplica y se recalcula', async () => {
  const base = baseFalsa();
  await cambiar(base, { status: 'AVAILABLE' });
  base.estado.asistentes = 200; // ahora se requieren 10 meseros, no 5

  const meseros = meserosDe((await consultar(base)).cuerpo);
  assert.equal(meseros.required_quantity, 10);
  assert.equal(meseros.is_manually_fulfilled, false, 'la marca se soltó');
  assert.equal(meseros.deficit_quantity, 10, 'vuelve el déficit real con lo nuevo');
});

test('HU-34: acepta el estado en español, en inglés y con los nombres del contrato; los otros dos estados se fijan a mano', async () => {
  for (const [entrada, guardado] of [['AVAILABLE', 'disponible'], ['available', 'disponible'], ['disponible', 'disponible'], ['listo', 'disponible'], ['TO_BUY', 'por_comprar'], ['por_comprar', 'por_comprar'], ['TO_PROCURE', 'por_conseguir'], ['por_conseguir', 'por_conseguir']]) {
    const base = baseFalsa();
    const r = await cambiar(base, { status: entrada });
    assert.equal(r.status, 200, entrada);
    assert.equal(base.filas[0].estado, guardado, entrada);
    assert.equal(base.filas[0].estado_manual, true, entrada);
  }
  // «estado» (el nombre que usa la pantalla) sigue funcionando
  const base = baseFalsa();
  assert.equal((await cambiar(base, { estado: 'disponible' })).status, 200);
  assert.equal(base.filas[0].estado, 'disponible');
});

test('HU-34 / HU-32: no existe «comprado»; un estado desconocido, vacío o sin cuerpo responde 400 y no escribe', async () => {
  for (const body of [{ status: 'BOUGHT' }, { status: 'COMPRADO' }, { status: 'cualquier cosa' }, { status: '' }, {}, undefined, { status: ['AVAILABLE'] }, { status: '__proto__' }, { status: 'constructor' }]) {
    const base = baseFalsa();
    const r = await cambiar(base, body);
    assert.equal(r.status, 400, JSON.stringify(body));
    assert.match(r.cuerpo.detalle, /AVAILABLE/);
    assert.equal(base.consultas.some((c) => c.sql.includes('UPDATE')), false, 'no escribió nada');
  }
});

test('HU-34: ids inválidos responden 400 y un recurso que no es de ese evento responde 404', async () => {
  for (const params of [{ id: 'abc', recursoId: '1' }, { id: '10', recursoId: 'itm-chair-001' }, { id: '10', recursoId: '0' }, { id: '10', recursoId: '99999999999' }]) {
    assert.equal((await cambiar(baseFalsa(), { status: 'AVAILABLE' }, params)).status, 400, JSON.stringify(params));
  }
  const r = await cambiar(baseFalsa(), { status: 'AVAILABLE' }, { id: '10', recursoId: '999' });
  assert.equal(r.status, 404);
  const otroEvento = await cambiar(baseFalsa(), { status: 'AVAILABLE' }, { id: '11', recursoId: '1' });
  assert.equal(otroEvento.status, 404, 'el recurso 1 es del evento 10, no del 11');
});

test('HU-34: la ruta del contrato PATCH /logistics-balance/items/:itemId/status existe', () => {
  const rutas = eventosRoutes.stack
    .filter((capa) => capa.route)
    .flatMap((capa) => Object.keys(capa.route.methods).map((metodo) => `${metodo.toUpperCase()} ${capa.route.path}`));
  assert.ok(rutas.includes('PATCH /:eventId/logistics-balance/items/:itemId/status'), rutas.filter((r) => r.startsWith('PATCH')).join(' | '));
});

test('HU-34: un recurso marcado a mano como disponible se presenta cubierto, sin tocar los demás ni cambiar lo calculado', () => {
  const fila = (extra) => ({ id: 1, evento_id: 10, categoria: 'mobiliario', recurso_nombre: 'Centros de mesa', cantidad_requerida: 10, cantidad_disponible: 0, unidad_medida: 'unidades', estado: 'pendiente', ...extra });

  const sinMarca = estructurarRespuestaBalance(10, [fila({})], { id: 10, nombre_evento: 'Boda', asistentes: 100 }).recursos[0];
  assert.deepEqual([sinMarca.status, sinMarca.deficit_quantity, sinMarca.available_quantity], ['PENDING', 10, 0], 'el ejemplo del ticket: PENDING con 10 de déficit');

  const conMarca = estructurarRespuestaBalance(10, [fila({ estado: 'disponible', estado_manual: true })], { id: 10, nombre_evento: 'Boda', asistentes: 100 }).recursos[0];
  assert.deepEqual([conMarca.status, conMarca.deficit_quantity, conMarca.available_quantity], ['AVAILABLE', 0, 10]);

  // Un estado manual que no es «disponible» no tapa el déficit
  const porComprar = estructurarRespuestaBalance(10, [fila({ estado: 'por_comprar', estado_manual: true })], { id: 10, nombre_evento: 'Boda', asistentes: 100 }).recursos[0];
  assert.deepEqual([porComprar.status, porComprar.deficit_quantity, porComprar.is_manually_fulfilled, porComprar.estado_manual], ['TO_BUY', 10, false, true]);
});
