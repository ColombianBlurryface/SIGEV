/**
 * Pruebas de las reglas de las recetas (HU-46 · RF-54). Se corren con:  npm test  (desde backend/)
 * Revisan la validación y las unidades sin necesitar base de datos; la API completa se prueba en ../qa.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { validarReceta, normalizarUnidad, claveNombre, aGramos, CODIGOS_UNIDAD, UNIDADES } = require('../src/config/reglasReceta');

const linea = (o = {}) => ({ nombre_ingrediente: 'Papa', unidad_compra: 'arroba', cantidad_porcion: 150, unidad_porcion: 'gramo', ...o });
const receta = (...lineas) => ({ ingredientes: lineas });

test('solo existen cuatro unidades: gramo, kilo, libra y arroba', () => {
  assert.deepEqual(CODIGOS_UNIDAD, ['gramo', 'kilo', 'libra', 'arroba']);
});

test('escenario 1: «Papa: 150 g (compra: arroba)» es válido', () => {
  const r = validarReceta(receta(linea()));
  assert.equal(r.error, undefined);
  assert.deepEqual(r.ingredientes[0], { nombre: 'Papa', clave: 'papa', unidad_compra: 'arroba', cantidad_porcion: 150, unidad_porcion: 'gramo' });
});

test('escenario 2: litros, paquetes y cualquier otra unidad se rechazan diciendo cuáles se permiten', () => {
  for (const mala of ['LITROS', 'litros', 'PAQUETES', 'ml', 'onzas', 'unidad', '', ' ', null, 5, undefined, {}]) {
    for (const campo of ['unidad_compra', 'unidad_porcion']) {
      const r = validarReceta(receta(linea({ [campo]: mala })));
      assert.ok(r.error, `${campo} = ${JSON.stringify(mala)} debía rechazarse`);
      assert.match(r.error, /solo gramos, kilos, libras o arrobas/);
    }
  }
});

test('las unidades de la historia (GRAM, KILO, POUND, ARROBA), el plural y las abreviaturas se aceptan', () => {
  const casos = { GRAM: 'gramo', KILO: 'kilo', POUND: 'libra', ARROBA: 'arroba', Gramos: 'gramo', ' kilos ': 'kilo', LB: 'libra', kg: 'kilo', g: 'gramo', arrobas: 'arroba', '@': 'arroba' };
  for (const [entrada, esperado] of Object.entries(casos)) assert.equal(normalizarUnidad(entrada), esperado, entrada);
});

test('la cantidad por porción debe ser un número mayor a 0 (0, negativos, texto, NaN e infinito se rechazan)', () => {
  for (const mala of [0, -1, -0.5, '80', '', null, undefined, NaN, Infinity, -Infinity, true, [], {}]) {
    const r = validarReceta(receta(linea({ cantidad_porcion: mala })));
    assert.match(r.error ?? '', /mayor a 0/, `cantidad ${JSON.stringify(mala)}`);
  }
  assert.equal(validarReceta(receta(linea({ cantidad_porcion: 0.001 }))).error, undefined);
});

test('la cantidad admite máximo 3 decimales', () => {
  assert.equal(validarReceta(receta(linea({ cantidad_porcion: 12.345 }))).error, undefined);
  assert.match(validarReceta(receta(linea({ cantidad_porcion: 12.3456 }))).error, /3 decimales/);
  assert.match(validarReceta(receta(linea({ cantidad_porcion: 0.0001 }))).error, /3 decimales/);
});

test('una porción no pasa de 1 kg por persona, en cualquier unidad', () => {
  assert.equal(validarReceta(receta(linea({ cantidad_porcion: 1000 }))).error, undefined);
  assert.match(validarReceta(receta(linea({ cantidad_porcion: 1001 }))).error, /máximo es 1\.000 g/);
  assert.equal(validarReceta(receta(linea({ cantidad_porcion: 1, unidad_porcion: 'kilo' }))).error, undefined);
  assert.match(validarReceta(receta(linea({ cantidad_porcion: 1.5, unidad_porcion: 'kilo' }))).error, /equivale a 1\.500 g/);
  assert.match(validarReceta(receta(linea({ cantidad_porcion: 3, unidad_porcion: 'libra' }))).error, /equivale a 1\.500 g/);
  assert.match(validarReceta(receta(linea({ cantidad_porcion: 1, unidad_porcion: 'arroba' }))).error, /equivale a 12\.500 g/);
  assert.equal(aGramos(2, 'libra'), 1000);
  assert.equal(UNIDADES.arroba.gramos, 25 * UNIDADES.libra.gramos);
});

test('la receta debe tener de 1 a 30 ingredientes y ser una lista', () => {
  for (const mala of [undefined, null, 'x', {}, 5, { ingredientes: 'x' }, { ingredientes: {} }, { ingredientes: null }]) {
    assert.ok(validarReceta(mala).error, JSON.stringify(mala));
  }
  assert.match(validarReceta({ ingredientes: [] }).error, /al menos un ingrediente/);
  const treinta = Array.from({ length: 30 }, (_, i) => linea({ nombre_ingrediente: `Ingrediente ${i}` }));
  assert.equal(validarReceta({ ingredientes: treinta }).error, undefined);
  assert.match(validarReceta({ ingredientes: [...treinta, linea({ nombre_ingrediente: 'Uno más' })] }).error, /máximo 30/);
  assert.match(validarReceta({ ingredientes: [null] }).error, /no es válido/);
  assert.match(validarReceta({ ingredientes: [[]] }).error, /no es válido/);
});

test('el nombre es obligatorio (máximo 100) y no se repite en la receta aunque cambien mayúsculas, tildes o espacios', () => {
  for (const malo of ['', '   ', null, undefined, 5, 'x'.repeat(101)]) {
    assert.match(validarReceta(receta(linea({ nombre_ingrediente: malo }))).error, /obligatorio/, String(malo));
  }
  assert.equal(validarReceta(receta(linea({ nombre_ingrediente: 'x'.repeat(100) }))).error, undefined);
  assert.match(validarReceta(receta(linea({ nombre_ingrediente: 'Pimentón' }), linea({ nombre_ingrediente: '  pimenton ' }))).error, /repetido/);
  assert.match(validarReceta(receta(linea({ nombre_ingrediente: 'Pechuga de   pollo' }), linea({ nombre_ingrediente: 'pechuga DE pollo' }))).error, /repetido/);
  assert.equal(claveNombre('  Pechuga   de POLLO '), 'pechuga de pollo');
  // el nombre se guarda limpio: sin espacios de más
  assert.equal(validarReceta(receta(linea({ nombre_ingrediente: '  Pechuga   de pollo ' }))).ingredientes[0].nombre, 'Pechuga de pollo');
});

test('la receta de ejemplo «Arroz verde con almendras» (3 ingredientes) es válida', () => {
  const r = validarReceta(receta(
    linea({ nombre_ingrediente: 'Arroz', unidad_compra: 'kilo', cantidad_porcion: 80 }),
    linea({ nombre_ingrediente: 'Almendras', unidad_compra: 'libra', cantidad_porcion: 15 }),
    linea({ nombre_ingrediente: 'Cilantro', unidad_compra: 'libra', cantidad_porcion: 10 })
  ));
  assert.equal(r.error, undefined);
  assert.equal(r.ingredientes.length, 3);
});
