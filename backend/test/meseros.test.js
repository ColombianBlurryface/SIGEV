/**
 * Pruebas del cálculo de meseros (HU-21 · RF-28, RN-04, RN-12). Se corren con:  npm test  (desde backend/)
 * Los cuatro escenarios de aceptación de la historia están aquí; los de 12 y 0 asistentes solo se pueden probar a
 * este nivel porque un evento real exige entre 40 y 600 asistentes (RN-01).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { calcularMeseros, ASISTENTES_POR_MESERO } = require('../src/config/reglasPersonal');

test('la relación es de 1 mesero por cada 20 asistentes (RN-04)', () => {
  assert.equal(ASISTENTES_POR_MESERO, 20);
});

test('escenario 1: 45 asistentes → 2,25 → se redondea hacia arriba a 3 (RN-12)', () => {
  assert.equal(calcularMeseros(45), 3);
});

test('escenario 2: 60 asistentes (múltiplo exacto) → 3', () => {
  assert.equal(calcularMeseros(60), 3);
});

test('escenario 3: 12 asistentes → 0,6 → 1 (siempre al menos 1 si hay asistentes)', () => {
  assert.equal(calcularMeseros(12), 1);
  assert.equal(calcularMeseros(1), 1);
});

test('escenario 4: 0 asistentes → 0', () => {
  assert.equal(calcularMeseros(0), 0);
});

test('límites alrededor de cada múltiplo de 20 (no hay un falso 2 por truncar)', () => {
  assert.equal(calcularMeseros(19), 1);
  assert.equal(calcularMeseros(20), 1);
  assert.equal(calcularMeseros(21), 2);
  assert.equal(calcularMeseros(40), 2);
  assert.equal(calcularMeseros(41), 3);
  assert.equal(calcularMeseros(300), 15);
  assert.equal(calcularMeseros(301), 16);
  assert.equal(calcularMeseros(599), 30);
  assert.equal(calcularMeseros(600), 30);
});

test('valores raros no rompen: negativos, texto, nulos y decimales', () => {
  assert.equal(calcularMeseros(-5), 0);
  assert.equal(calcularMeseros('abc'), 0);
  assert.equal(calcularMeseros(null), 0);
  assert.equal(calcularMeseros(undefined), 0);
  assert.equal(calcularMeseros(Number.NaN), 0);
  assert.equal(calcularMeseros('45'), 3);
  assert.equal(calcularMeseros(20.5), 2);
});

test('para todos los asistentes válidos (40 a 600) el resultado es el techo exacto de asistentes / 20', () => {
  for (let a = 40; a <= 600; a++) {
    const esperado = Math.floor((a + ASISTENTES_POR_MESERO - 1) / ASISTENTES_POR_MESERO); // techo con enteros
    assert.equal(calcularMeseros(a), esperado, `${a} asistentes`);
  }
});
