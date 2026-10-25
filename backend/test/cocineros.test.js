/**
 * Pruebas del cálculo de cocineros (HU-22 · RF-29, RN-05, RN-12). Se corren con:  npm test  (desde backend/)
 * Los tres escenarios de aceptación de la historia y los ejemplos del checklist están aquí.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { calcularCocineros, ASISTENTES_POR_GRUPO_COCINA, COCINEROS_POR_GRUPO } = require('../src/config/reglasPersonal');

test('la regla es de 2 cocineros por cada 25 asistentes (RN-05)', () => {
  assert.equal(ASISTENTES_POR_GRUPO_COCINA, 25);
  assert.equal(COCINEROS_POR_GRUPO, 2);
});

test('escenario 1: 100 asistentes (múltiplo exacto de 25) → 4 grupos → 8 cocineros', () => {
  assert.equal(calcularCocineros(100), 8);
});

test('escenario 2: 320 asistentes → 12,8 → se redondea hacia arriba a 13 → 26 cocineros (RN-12)', () => {
  assert.equal(calcularCocineros(320), 26);
});

test('escenario 3: no depende de la comida; la función solo recibe los asistentes', () => {
  assert.equal(calcularCocineros.length, 1);
  assert.equal(calcularCocineros(40), 4);
  assert.equal(calcularCocineros(40, 'buffet'), 4);
  assert.equal(calcularCocineros(40, 'snacks ligeros'), 4);
});

test('ejemplos del checklist: 40 → 4; 100 → 8; 200 → 16; 300 → 24; 320 → 26; 600 → 48', () => {
  for (const [asistentes, esperado] of [[40, 4], [100, 8], [200, 16], [300, 24], [320, 26], [600, 48]]) {
    assert.equal(calcularCocineros(asistentes), esperado, `${asistentes} asistentes`);
  }
});

test('casos límite: 50 → 4 y 51 → 6 (el techo se aplica a los grupos antes de multiplicar por 2)', () => {
  assert.equal(calcularCocineros(50), 4);
  assert.equal(calcularCocineros(51), 6);
});

test('alrededor de cada múltiplo de 25 el número sube de 2 en 2 y nunca se trunca', () => {
  assert.equal(calcularCocineros(1), 2);
  assert.equal(calcularCocineros(24), 2);
  assert.equal(calcularCocineros(25), 2);
  assert.equal(calcularCocineros(26), 4);
  assert.equal(calcularCocineros(75), 6);
  assert.equal(calcularCocineros(76), 8);
  assert.equal(calcularCocineros(299), 24);
  assert.equal(calcularCocineros(301), 26);
  assert.equal(calcularCocineros(575), 46);
  assert.equal(calcularCocineros(576), 48);
});

test('siempre sale un número par (2 por grupo) en todo el rango permitido de 40 a 600 asistentes', () => {
  let anterior = 0;
  for (let n = 40; n <= 600; n++) {
    const c = calcularCocineros(n);
    assert.equal(c % 2, 0, `${n} asistentes dio ${c}`);
    assert.equal(c, Math.floor((n + 24) / 25) * 2, `${n} asistentes: distinto del cálculo con enteros`);
    assert.ok(c >= anterior, `${n} asistentes bajó de ${anterior} a ${c}`);
    assert.ok(c * ASISTENTES_POR_GRUPO_COCINA / COCINEROS_POR_GRUPO >= n, `${n} asistentes: faltan cocineros`);
    anterior = c;
  }
});

test('0 asistentes → 0; valores raros no rompen: negativos, texto, nulos y NaN', () => {
  assert.equal(calcularCocineros(0), 0);
  assert.equal(calcularCocineros(-5), 0);
  assert.equal(calcularCocineros('abc'), 0);
  assert.equal(calcularCocineros(null), 0);
  assert.equal(calcularCocineros(undefined), 0);
  assert.equal(calcularCocineros(Number.NaN), 0);
  assert.equal(calcularCocineros(Infinity), 0);
  assert.equal(calcularCocineros('100'), 8);
});
