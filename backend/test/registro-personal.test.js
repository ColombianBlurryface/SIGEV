/**
 * Pruebas de las reglas del registro de meseros (HU-26 · RF-33). Se corren con:  npm test  (desde backend/)
 * Revisan la validación sin necesitar base de datos; la API completa se prueba en ../qa.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { validarPersonal, normalizarRol, NOMBRE_MAX, CONTACTO_MAX } = require('../src/config/reglasRegistroPersonal');

const mesero = (o = {}) => ({ nombre_completo: 'Carlos Rodríguez', contacto: '3001234567', ...o });

test('escenario 1: «Carlos Rodríguez» con contacto «3001234567» es válido y queda con el rol mesero', () => {
  const r = validarPersonal(mesero());
  assert.equal(r.error, undefined);
  assert.deepEqual(r, { nombre_completo: 'Carlos Rodríguez', contacto: '3001234567', rol: 'mesero' });
});

test('el contacto puede ser un teléfono, un correo o ambos con separadores', () => {
  for (const bueno of ['3001234567', '+57 300 123 4567', '(601) 555-1234', 'carlos.r@email.com', 'carlos.r@email.com / +57 300 123 4567', '300 123 4567 / 315 987 6543', 'Llamar al 3001234567', 'a@b.co']) {
    assert.equal(validarPersonal(mesero({ contacto: bueno })).error, undefined, bueno);
  }
});

test('escenario 3: sin contacto (vacío, espacios, null, ausente) da «El contacto es obligatorio»', () => {
  for (const malo of ['', '   ', null, undefined, '\n\t']) {
    assert.match(validarPersonal(mesero({ contacto: malo })).error, /contacto es obligatorio/, JSON.stringify(malo));
  }
  assert.match(validarPersonal({ nombre_completo: 'Ana' }).error, /contacto es obligatorio/);
});

test('un contacto que no es un teléfono ni un correo se rechaza (texto libre, pocos dígitos, símbolos raros)', () => {
  for (const malo of ['hola', 'sin datos', '12345', '123456', 'ana@', '@correo.com', 'ana@correo', '<script>alert(1)</script>', '3001234567 <b>', 'ana@correo.c', 5, {}, [], true]) {
    assert.ok(validarPersonal(mesero({ contacto: malo })).error, JSON.stringify(malo));
  }
  assert.match(validarPersonal(mesero({ contacto: 'hola' })).error, /teléfono \(mínimo 7 dígitos\) o un correo válido/);
});

test('el contacto admite máximo 150 caracteres', () => {
  assert.equal(validarPersonal(mesero({ contacto: '3'.repeat(CONTACTO_MAX) })).error, undefined);
  assert.match(validarPersonal(mesero({ contacto: '3'.repeat(CONTACTO_MAX + 1) })).error, /máximo 150/);
});

test('el nombre es obligatorio y solo letras: con números, símbolos, emoji o de un carácter se rechaza', () => {
  for (const malo of ['', '   ', null, undefined, 5, {}, [], 'A', 'Carlos123', '12345', 'Carlos_R', 'Carlos <b>', 'Carlos 🍕', '--', '. . .', '@carlos']) {
    assert.ok(validarPersonal(mesero({ nombre_completo: malo })).error, JSON.stringify(malo));
  }
  assert.match(validarPersonal(mesero({ nombre_completo: '' })).error, /nombre completo es obligatorio/);
});

test('nombres reales con tildes, ñ, apóstrofos, puntos y guiones se aceptan, y los espacios se limpian', () => {
  for (const bueno of ['María José Peña', "Sinéad O'Connor", 'Juan Pérez Jr.', 'Ana-María López', 'Núñez', 'Li', 'Ångström', 'Рамиль Гарипов']) {
    assert.equal(validarPersonal(mesero({ nombre_completo: bueno })).error, undefined, bueno);
  }
  assert.equal(validarPersonal(mesero({ nombre_completo: '   Ana   María    López  ', contacto: '  3001234567   ' })).nombre_completo, 'Ana María López');
  assert.equal(validarPersonal(mesero({ contacto: '  +57   300  123 4567 ' })).contacto, '+57 300 123 4567');
});

test('el nombre admite máximo 150 caracteres', () => {
  assert.equal(validarPersonal(mesero({ nombre_completo: 'a'.repeat(NOMBRE_MAX) })).error, undefined);
  assert.match(validarPersonal(mesero({ nombre_completo: 'a'.repeat(NOMBRE_MAX + 1) })).error, /de 2 a 150 caracteres/);
});

test('el rol es mesero por defecto; se acepta WAITER, mayúsculas y espacios; cualquier otro se rechaza', () => {
  for (const bueno of [undefined, null, 'mesero', 'MESERO', ' Mesero ', 'WAITER', 'waiter']) assert.equal(validarPersonal(mesero({ rol: bueno })).rol, 'mesero', String(bueno));
  for (const malo of ['cocinero', 'COOK', 'admin', '', 5, {}, []]) assert.match(validarPersonal(mesero({ rol: malo })).error ?? '', /rol debe ser/, JSON.stringify(malo));
  assert.equal(normalizarRol('WAITER'), 'mesero'); assert.equal(normalizarRol('x'), null); assert.equal(normalizarRol(null), null);
});

test('un cuerpo que no es un objeto se rechaza y los campos de más (id, activo) se ignoran', () => {
  for (const malo of [null, undefined, [], 'hola', 5]) assert.ok(validarPersonal(malo).error, String(malo));
  const r = validarPersonal(mesero({ id: 99, activo: false, creado_en: '2000-01-01' }));
  assert.deepEqual(Object.keys(r).sort(), ['contacto', 'nombre_completo', 'rol']);
});
