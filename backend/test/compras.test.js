/**
 * Pruebas del cálculo de ingredientes a comprar (HU-47 · RF-55, RN-09, RN-20). Se corren con:  npm test  (desde backend/)
 * Los tres escenarios de aceptación de la historia y los ejemplos del checklist están aquí.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { calcularCompras, MARGEN_PORCENTAJE } = require('../src/config/reglasCompras');

const linea = (o = {}) => ({ plato: 'Plato', ingrediente_id: 1, ingrediente: 'Pechuga de pollo', cantidad_porcion: 200, unidad_porcion: 'gramo', unidad_compra: 'kilo', ...o });
const uno = (asistentes, lineas) => calcularCompras(asistentes, lineas)[0];

test('el margen es del 10 % (RN-09)', () => assert.equal(MARGEN_PORCENTAJE, 10));

test('escenario 1: 100 asistentes × 200 g de pechuga = 20.000 g → 22.000 g con margen → 22 kilos (sin caer en 23 por decimales)', () => {
  const r = uno(100, [linea()]);
  assert.equal(r.gramos_base, 20000);
  assert.equal(r.gramos_con_margen, 22000);
  assert.equal(r.cantidad_a_comprar, 22);
  assert.equal(r.unidad_compra, 'kilo');
  assert.equal(r.cantidad_exacta, 22);
});

test('escenario 2: cilantro de dos platos (10 g y 5 g) con 50 asistentes → 750 g → 825 g → 1,65 libras → 2 libras', () => {
  const r = calcularCompras(50, [
    linea({ plato: 'Plato A', ingrediente_id: 7, ingrediente: 'Cilantro', cantidad_porcion: 10, unidad_compra: 'libra' }),
    linea({ plato: 'Plato B', ingrediente_id: 7, ingrediente: 'Cilantro', cantidad_porcion: 5, unidad_compra: 'libra' }),
  ]);
  assert.equal(r.length, 1, 'un solo total');
  assert.equal(r[0].gramos_base, 750);
  assert.equal(r[0].gramos_con_margen, 825);
  assert.equal(r[0].cantidad_exacta, 1.65);
  assert.equal(r[0].cantidad_a_comprar, 2);
  assert.deepEqual(r[0].platos, ['Plato A', 'Plato B']);
});

test('escenario 3: 200 asistentes × 150 g de papa = 30.000 g → 33.000 g → 2,64 arrobas → 3 arrobas', () => {
  const r = uno(200, [linea({ ingrediente: 'Papa', cantidad_porcion: 150, unidad_compra: 'arroba' })]);
  assert.equal(r.gramos_base, 30000);
  assert.equal(r.gramos_con_margen, 33000);
  assert.equal(r.cantidad_exacta, 2.64);
  assert.equal(r.cantidad_a_comprar, 3);
});

test('ejemplo del checklist: 40 asistentes, 150 g de papa → 6.600 g = 6,6 kg → 1 arroba', () => {
  const r = uno(40, [linea({ ingrediente: 'Papa', cantidad_porcion: 150, unidad_compra: 'arroba' })]);
  assert.equal(r.gramos_con_margen, 6600);
  assert.equal(r.cantidad_a_comprar, 1);
});

test('el redondeo es siempre hacia arriba: justo en un múltiplo no sube, un gramo más sí', () => {
  // 22.000 g con margen = 22 kg exactos; con 1 gramo más por persona ya son 22,11 kg → 23
  assert.equal(uno(100, [linea({ cantidad_porcion: 200 })]).cantidad_a_comprar, 22);
  assert.equal(uno(100, [linea({ cantidad_porcion: 201 })]).cantidad_a_comprar, 23);
  assert.equal(uno(100, [linea({ cantidad_porcion: 1 })]).cantidad_a_comprar, 1); // 110 g → 0,11 kg → 1
});

test('las porciones pueden estar en kilos, libras o arrobas y se convierten a gramos', () => {
  assert.equal(uno(100, [linea({ cantidad_porcion: 0.2, unidad_porcion: 'kilo' })]).gramos_base, 20000);
  assert.equal(uno(100, [linea({ cantidad_porcion: 0.4, unidad_porcion: 'libra' })]).gramos_base, 20000);
  assert.equal(uno(100, [linea({ cantidad_porcion: 0.016, unidad_porcion: 'arroba' })]).gramos_base, 20000);
});

test('si se compra por gramo, se redondea al gramo; por libra y por arroba también', () => {
  assert.equal(uno(100, [linea({ cantidad_porcion: 0.5, unidad_compra: 'gramo' })]).cantidad_a_comprar, 55);
  assert.equal(uno(100, [linea({ cantidad_porcion: 0.123, unidad_compra: 'gramo' })]).cantidad_a_comprar, 14); // 13,53 → 14
  assert.equal(uno(100, [linea({ unidad_compra: 'libra' })]).cantidad_a_comprar, 44);
  assert.equal(uno(100, [linea({ unidad_compra: 'arroba' })]).cantidad_a_comprar, 2); // 22 kg / 12,5 = 1,76 → 2
});

test('el margen se aplica UNA vez sobre el total sumado, no por plato (no se compra de más)', () => {
  // 3 platos de 3 g por persona con 50 asistentes: 450 g → 495 g → 1 libra. Por plato serían 3 libras.
  const lineas = [1, 2, 3].map((i) => linea({ plato: `P${i}`, ingrediente_id: 9, ingrediente: 'Sal', cantidad_porcion: 3, unidad_compra: 'libra' }));
  const r = calcularCompras(50, lineas);
  assert.equal(r.length, 1); assert.equal(r[0].gramos_base, 450); assert.equal(r[0].cantidad_a_comprar, 1);
});

test('un mismo plato dos veces en la lista del mismo ingrediente se suma; el nombre del plato no se repite', () => {
  const r = calcularCompras(100, [linea({ plato: 'X', ingrediente_id: 2 }), linea({ plato: 'X', ingrediente_id: 2 })]);
  assert.equal(r[0].gramos_base, 40000); assert.deepEqual(r[0].platos, ['X']);
});

test('ingredientes distintos quedan separados y ordenados por nombre', () => {
  const r = calcularCompras(100, [linea({ ingrediente_id: 3, ingrediente: 'Papa' }), linea({ ingrediente_id: 1, ingrediente: 'Arroz' }), linea({ ingrediente_id: 2, ingrediente: 'Pimentón' })]);
  assert.deepEqual(r.map((x) => x.ingrediente), ['Arroz', 'Papa', 'Pimentón']);
});

test('se actualiza con los asistentes: más asistentes, más compra, siempre alcanzan', () => {
  let anterior = 0;
  for (let n = 40; n <= 600; n++) {
    const r = uno(n, [linea({ cantidad_porcion: 150, unidad_compra: 'arroba', ingrediente: 'Papa' })]);
    const necesarioGramos = n * 150 * 1.1;
    assert.ok(r.cantidad_a_comprar * 12500 >= necesarioGramos - 1e-6, `${n} asistentes: no alcanza`);
    assert.ok((r.cantidad_a_comprar - 1) * 12500 < necesarioGramos + 1e-6, `${n} asistentes: se compra de más`);
    assert.ok(r.cantidad_a_comprar >= anterior, `${n} asistentes: bajó`);
    anterior = r.cantidad_a_comprar;
  }
});

test('sin asistentes válidos, sin recetas o con datos raros no rompe y devuelve una lista vacía', () => {
  for (const a of [0, -5, NaN, Infinity, 'abc', null, undefined]) assert.deepEqual(calcularCompras(a, [linea()]), []);
  assert.deepEqual(calcularCompras(100, []), []);
  assert.deepEqual(calcularCompras(100, null), []);
  assert.deepEqual(calcularCompras(100, [linea({ cantidad_porcion: 0 }), linea({ cantidad_porcion: -3 }), linea({ cantidad_porcion: 'x' })]), []);
  assert.deepEqual(calcularCompras(100, [linea({ unidad_compra: 'litro' }), linea({ unidad_porcion: 'paquete' })]), []);
});

test('un número de asistentes con decimal se sube al siguiente entero', () => {
  assert.equal(uno(99.2, [linea()]).gramos_base, uno(100, [linea()]).gramos_base);
});
