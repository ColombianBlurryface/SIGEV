/**
 * Pruebas de las reglas de la asignación de meseros a un evento (HU-28 · RF-35). Se corren con:  npm test
 * Revisan la validación y la comparación con los meseros requeridos sin necesitar base de datos.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { validarAsignacion, compararConRequeridos, idDeRuta, MAX_ASIGNADOS } = require('../src/config/reglasAsignacionPersonal');

test('una lista de ids enteros positivos se acepta tal cual; la vacía también (quita a todos)', () => {
  assert.deepEqual(validarAsignacion({ personal_ids: [1, 5, 12] }), { ids: [1, 5, 12] });
  assert.deepEqual(validarAsignacion({ personal_ids: [] }), { ids: [] });
  assert.deepEqual(validarAsignacion({ staff_ids: [3, 4] }), { ids: [3, 4] }, 'el nombre de la historia también se entiende');
});

test('personal_ids debe ser una lista: ausente, null, texto, objeto o número se rechazan', () => {
  for (const malo of [{}, { personal_ids: null }, { personal_ids: 'abc' }, { personal_ids: 5 }, { personal_ids: { 0: 1 } }, { personal_ids: true }]) {
    assert.match(validarAsignacion(malo).error, /personal_ids debe ser una lista/, JSON.stringify(malo));
  }
  for (const malo of [null, undefined, [], 'hola', 5]) assert.ok(validarAsignacion(malo).error, String(malo));
});

test('cada id debe ser un entero positivo: texto, 0, negativos, decimales, nulos y gigantes se rechazan', () => {
  for (const malo of ['1', 'abc', 0, -1, 1.5, null, undefined, NaN, Infinity, 1e21, 2147483648, true, [], {}]) {
    assert.ok(validarAsignacion({ personal_ids: [1, malo] }).error, JSON.stringify(malo));
  }
  assert.match(validarAsignacion({ personal_ids: [1, 'x'] }).error, /mesero 2 de la lista/);
  assert.equal(validarAsignacion({ personal_ids: [2147483647] }).error, undefined);
});

test('un mesero repetido en la lista se rechaza (cada mesero se asigna una sola vez)', () => {
  assert.match(validarAsignacion({ personal_ids: [1, 2, 1] }).error, /ID 1 está repetido/);
});

test('máximo 100 meseros por evento', () => {
  assert.equal(validarAsignacion({ personal_ids: Array.from({ length: MAX_ASIGNADOS }, (_, i) => i + 1) }).error, undefined);
  assert.match(validarAsignacion({ personal_ids: Array.from({ length: MAX_ASIGNADOS + 1 }, (_, i) => i + 1) }).error, /máximo 100/);
});

test('escenario 3: un evento que requiere 5 meseros con 4 asignados reporta un déficit de 1', () => {
  assert.deepEqual(compararConRequeridos(4, 5), { diferencia: -1, deficit: 1, excedente: 0, estado: 'deficit' });
});

test('completo, excedente y sin asignar frente a los requeridos', () => {
  assert.deepEqual(compararConRequeridos(5, 5), { diferencia: 0, deficit: 0, excedente: 0, estado: 'completo' });
  assert.deepEqual(compararConRequeridos(7, 5), { diferencia: 2, deficit: 0, excedente: 2, estado: 'excedente' });
  assert.deepEqual(compararConRequeridos(0, 5), { diferencia: -5, deficit: 5, excedente: 0, estado: 'deficit' });
});

test('el id del evento en la ruta es un entero positivo en texto', () => {
  assert.equal(idDeRuta('201'), 201);
  for (const malo of ['abc', '0', '-1', '1.5', '1e21', '99999999999', '', 'evt-201', undefined]) assert.equal(idDeRuta(malo), null, String(malo));
});
