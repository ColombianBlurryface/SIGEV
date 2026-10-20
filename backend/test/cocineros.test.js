/**
 * Pruebas del cálculo de cocineros para una cena (HU-22 · RF-29, RN-05). Se corren con:  npm test  (desde backend/)
 * Regla: (asistentes ÷ 30, redondeado hacia arriba) × 2, con mínimo de 2. Solo para eventos con servicio de cena.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { calcularCocineros, ASISTENTES_POR_GRUPO_COCINA, COCINEROS_POR_GRUPO, MINIMO_COCINEROS_CENA, TIPOS_SERVICIO_COMIDA } = require('../src/config/reglasPersonal');

test('las constantes de la regla (RN-05): grupos de 30, 2 cocineros por grupo, mínimo 2', () => {
  assert.equal(ASISTENTES_POR_GRUPO_COCINA, 30);
  assert.equal(COCINEROS_POR_GRUPO, 2);
  assert.equal(MINIMO_COCINEROS_CENA, 2);
});

test('escenario 1: cena de 90 asistentes → 3 grupos × 2 = 6 cocineros (ejemplo de verificación)', () => {
  assert.equal(calcularCocineros(90, 'cena'), 6);
});

test('escenario 2: cena de 40 asistentes → 1,33 → 2 grupos × 2 = 4 cocineros', () => {
  assert.equal(calcularCocineros(40, 'cena'), 4);
});

test('escenario 3: cena de 10 asistentes → 1 grupo × 2 = 2 cocineros (el mínimo)', () => {
  assert.equal(calcularCocineros(10, 'cena'), 2);
  assert.equal(calcularCocineros(1, 'cena'), 2);
});

test('escenario 4: si el servicio no es una cena, la regla no aplica y son 0 cocineros', () => {
  for (const tipo of ['coctel', 'buffet', 'refrigerio', 'otro', null, undefined, '', 'CENA']) {
    assert.equal(calcularCocineros(100, tipo), 0, `tipo ${tipo}`);
  }
});

test('cena sin asistentes → 0', () => {
  assert.equal(calcularCocineros(0, 'cena'), 0);
  assert.equal(calcularCocineros(-3, 'cena'), 0);
  assert.equal(calcularCocineros(null, 'cena'), 0);
  assert.equal(calcularCocineros('abc', 'cena'), 0);
});

test('límites alrededor de cada múltiplo de 30 (no se trunca)', () => {
  assert.equal(calcularCocineros(29, 'cena'), 2);
  assert.equal(calcularCocineros(30, 'cena'), 2);
  assert.equal(calcularCocineros(31, 'cena'), 4);
  assert.equal(calcularCocineros(60, 'cena'), 4);
  assert.equal(calcularCocineros(61, 'cena'), 6);
  assert.equal(calcularCocineros(300, 'cena'), 20);
  assert.equal(calcularCocineros(301, 'cena'), 22);
  assert.equal(calcularCocineros(600, 'cena'), 40);
});

test('para toda cena de 1 a 600 asistentes, nunca menos de 2 y siempre el techo exacto × 2', () => {
  for (let a = 1; a <= 600; a++) {
    const esperado = Math.max(2, Math.floor((a + 29) / 30) * 2);
    assert.equal(calcularCocineros(a, 'cena'), esperado, `${a} asistentes`);
    assert.ok(calcularCocineros(a, 'cena') >= 2, `${a} asistentes: menos de 2`);
  }
});

test('el tipo de servicio es uno de la lista y «cena» está incluida', () => {
  assert.deepEqual(Object.keys(TIPOS_SERVICIO_COMIDA), ['cena', 'coctel', 'buffet', 'refrigerio', 'otro']);
});
