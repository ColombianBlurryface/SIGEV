/**
 * Pruebas de que una receta de cóctel solo admite LICORES como ingredientes (HU-44 · RF-52).
 *
 * Los cócteles que se crean también quedan en el catálogo del bar (clasificacion «bar_cocteleria»), pero con tipo de cálculo
 * «unidad_persona»; los licores se compran por botella («botella_compartida»). Un cóctel no puede ser ingrediente de otro.
 * Se prueba con una base falsa que sí distingue los dos tipos, igual que la base real.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { crearCoctel, editarCoctel } = require('../src/controllers/coctelesController');
const pool = require('../src/config/db');

const LICOR = 1;   // «Aguardiente»: botella_compartida
const COCTEL = 2;  // «Gin Tonic» (ya creado): unidad_persona

/** Base falsa: responde la consulta que valida los licores como lo haría Postgres con el filtro que lleve esa consulta. */
const baseFalsa = () => {
  const consultas = [];
  const cliente = {
    query: async (sql, params) => {
      consultas.push({ sql, params });
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return {};
      if (sql.includes('FROM cocteles WHERE id')) return { rowCount: 1, rows: [{ nombre: 'Mojito' }] };
      if (sql.includes('FROM catalogo_productos') && sql.includes('ANY($1::int[])')) {
        const soloLicores = sql.includes("tipo_calculo = 'botella_compartida'");
        const filas = [{ id: LICOR, tipo: 'botella_compartida' }, { id: COCTEL, tipo: 'unidad_persona' }]
          .filter((p) => params[0].includes(p.id) && (!soloLicores || p.tipo === 'botella_compartida'));
        return { rowCount: filas.length, rows: filas.map((p) => ({ id: p.id })) };
      }
      if (sql.includes('INSERT INTO cocteles')) return { rowCount: 1, rows: [{ id: 9, nombre: 'Prueba' }] };
      return { rowCount: 0, rows: [] };
    },
    release: () => {}
  };
  return { cliente, consultas };
};

const ejecutar = async (controlador, req) => {
  const base = baseFalsa();
  const original = pool.connect;
  pool.connect = async () => base.cliente;
  try {
    let status = null;
    let cuerpo = null;
    const res = {
      status: (c) => { status = c; return { json: (d) => { cuerpo = d; } }; },
      json: (d) => { status = 200; cuerpo = d; }
    };
    await controlador(req, res);
    return { status, cuerpo, consultas: base.consultas };
  } finally {
    pool.connect = original;
  }
};

const receta = (ids) => ({ nombre: 'Prueba', ingredientes: ids.map((id) => ({ licor_id: id, mililitros: 50 })) });

for (const [nombre, controlador, params] of [['crearCoctel', crearCoctel, {}], ['editarCoctel', editarCoctel, { id: '5' }]]) {
  test(`HU-44: ${nombre} rechaza un cóctel como ingrediente (400) y deshace la transacción`, async () => {
    const r = await ejecutar(controlador, { params, body: receta([LICOR, COCTEL]) });
    assert.equal(r.status, 400);
    assert.match(r.cuerpo.detalle, /un cóctel no puede ser ingrediente de otro/);
    assert.ok(r.consultas.some((c) => c.sql === 'ROLLBACK'), 'debe deshacer');
    assert.equal(r.consultas.some((c) => c.sql.includes('INSERT INTO coctel_ingredientes')), false, 'no guardó ingredientes');
  });

  test(`HU-44: ${nombre} pide a la base solo licores (tipo_calculo = botella_compartida)`, async () => {
    const r = await ejecutar(controlador, { params, body: receta([COCTEL]) });
    const validacion = r.consultas.find((c) => c.sql.includes('ANY($1::int[])'));
    assert.ok(validacion, 'no validó los licores');
    assert.match(validacion.sql, /tipo_calculo = 'botella_compartida'/);
    assert.equal(r.status, 400);
  });
}

test('HU-44: con licores reales la validación de ingredientes pasa (no responde 400 por esto)', async () => {
  const r = await ejecutar(crearCoctel, { params: {}, body: receta([LICOR]) });
  assert.notEqual(r.status, 400, JSON.stringify(r.cuerpo));
});
