/**
 * Pruebas de las reglas de las recetas de cóctel y del cálculo de licor (HU-44 · RF-52, HU-45 · RF-53, RN-15).
 * Se corren con:  npm test  (desde backend/). Revisan la validación estricta sin necesitar base de datos.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { validarCoctel, validarCalculo, idDeRuta, ML_MAX_POR_LICOR } = require('../src/config/reglasCoctel');

const receta = (o = {}) => ({ nombre: 'Mojito', ingredientes: [{ licor_id: 1, mililitros: 50 }], ...o });
const ing = (o = {}) => ({ licor_id: 1, mililitros: 50, ...o });

test('una receta válida se acepta y se limpia (nombre sin espacios, descripción vacía → null)', () => {
  const r = validarCoctel(receta({ nombre: '  Mojito  ', descripcion: '   ' }));
  assert.equal(r.error, undefined); assert.equal(r.nombre, 'Mojito'); assert.equal(r.descripcion, null);
  assert.deepEqual(r.ingredientes, [{ licor_id: 1, mililitros: 50 }]);
});

test('los mililitros: mayor a 0, máximo 250 y 2 decimales; 15.000 ml, texto, 0, negativos y NaN se rechazan', () => {
  for (const malo of [0, -1, 250.01, 251, 15000, 1e21, '50', '50abc', '', null, undefined, NaN, Infinity, true, [], {}]) {
    assert.ok(validarCoctel(receta({ ingredientes: [ing({ mililitros: malo })] })).error, `ml = ${JSON.stringify(malo)}`);
  }
  for (const bueno of [0.01, 0.5, 1, 12.34, 50, 249.99, ML_MAX_POR_LICOR]) {
    assert.equal(validarCoctel(receta({ ingredientes: [ing({ mililitros: bueno })] })).error, undefined, `ml = ${bueno}`);
  }
  assert.match(validarCoctel(receta({ ingredientes: [ing({ mililitros: 12.345 })] })).error, /2 decimales/);
  assert.match(validarCoctel(receta({ ingredientes: [ing({ mililitros: 0.001 })] })).error, /2 decimales/);
});

test('el nombre es obligatorio (máximo 150 caracteres) y la descripción es texto (máximo 500)', () => {
  for (const malo of ['', '   ', null, undefined, 5, {}, 'x'.repeat(151)]) assert.ok(validarCoctel(receta({ nombre: malo })).error, String(malo));
  assert.equal(validarCoctel(receta({ nombre: 'x'.repeat(150) })).error, undefined);
  for (const mala of [{ a: 1 }, 5, ['x'], 'x'.repeat(501)]) assert.ok(validarCoctel(receta({ descripcion: mala })).error, JSON.stringify(mala).slice(0, 20));
  assert.equal(validarCoctel(receta({ descripcion: 'x'.repeat(500) })).error, undefined);
});

test('los licores: de 1 a 6, ids enteros positivos, objetos válidos y sin repetir', () => {
  for (const malo of [undefined, null, 'x', {}, [], [null], [5], [[]], [ing({ licor_id: 'abc' })], [ing({ licor_id: '1' })], [ing({ licor_id: 0 })], [ing({ licor_id: -3 })], [ing({ licor_id: 1.5 })], [ing({ licor_id: 1e21 })], [ing({ licor_id: 2147483648 })], [ing({ licor_id: null })]]) {
    assert.ok(validarCoctel(receta({ ingredientes: malo })).error, JSON.stringify(malo));
  }
  const seis = Array.from({ length: 6 }, (_, i) => ing({ licor_id: i + 1 }));
  assert.equal(validarCoctel(receta({ ingredientes: seis })).error, undefined);
  assert.match(validarCoctel(receta({ ingredientes: [...seis, ing({ licor_id: 7 })] })).error, /más de 6 licores/);
  assert.match(validarCoctel(receta({ ingredientes: [ing(), ing({ mililitros: 30 })] })).error, /mismo licor/);
});

test('un cuerpo que no es un objeto se rechaza', () => {
  for (const malo of [null, undefined, [], 'hola', 5]) assert.ok(validarCoctel(malo).error, String(malo));
  for (const malo of [null, undefined, [], 'hola', 5]) assert.ok(validarCalculo(malo).error, String(malo));
});

test('cálculo de licor: asistentes enteros de 40 a 600 (nada de texto ni decimales)', () => {
  for (const malo of [39, 601, 0, -40, 40.5, 99.9, '100', '100abc', null, undefined, NaN, Infinity, 1e3, true]) {
    assert.ok(validarCalculo({ asistentes: malo, cocteles: [] }).error, `asistentes = ${JSON.stringify(malo)}`);
  }
  for (const bueno of [40, 41, 100, 599, 600]) assert.equal(validarCalculo({ asistentes: bueno, cocteles: [] }).error, undefined, String(bueno));
});

test('cálculo de licor: cócteles por persona es un entero de 1 a 10 (RN-15), ids válidos y sin repetir', () => {
  const calc = (c) => validarCalculo({ asistentes: 100, cocteles: [c] });
  for (const malo of [0, 11, -1, 2.7, '2', '2abc', null, undefined, NaN]) assert.ok(calc({ coctel_id: 1, cocteles_por_persona: malo }).error, `por persona = ${JSON.stringify(malo)}`);
  for (const bueno of [1, 2, 10]) assert.equal(calc({ coctel_id: 1, cocteles_por_persona: bueno }).error, undefined, String(bueno));
  for (const malo of ['abc', '1', 0, -1, 1.5, 1e21, null, undefined]) assert.ok(calc({ coctel_id: malo, cocteles_por_persona: 2 }).error, `coctel_id = ${JSON.stringify(malo)}`);
  assert.ok(validarCalculo({ asistentes: 100, cocteles: [null] }).error);
  assert.match(validarCalculo({ asistentes: 100, cocteles: [{ coctel_id: 1, cocteles_por_persona: 2 }, { coctel_id: 1, cocteles_por_persona: 3 }] }).error, /repetido/);
  assert.ok(validarCalculo({ asistentes: 100, cocteles: 'x' }).error);
  assert.ok(validarCalculo({ asistentes: 100, cocteles: Array.from({ length: 21 }, (_, i) => ({ coctel_id: i + 1, cocteles_por_persona: 1 })) }).error);
});

test('cálculo de licor: sin cócteles (ausente, null o lista vacía) es válido y da lista vacía', () => {
  for (const cocteles of [undefined, null, []]) assert.deepEqual(validarCalculo({ asistentes: 100, cocteles }), { asistentes: 100, cocteles: [] });
});

test('el id de la ruta es un entero positivo en texto (abc, 0, negativos, decimales y gigantes dan null)', () => {
  assert.equal(idDeRuta('7'), 7); assert.equal(idDeRuta('2147483647'), 2147483647);
  for (const malo of ['abc', '0', '-1', '1.5', '1e21', '99999999999', '', ' 3', '3 ', undefined, null]) assert.equal(idDeRuta(malo), null, String(malo));
});
