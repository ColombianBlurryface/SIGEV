/**
 * Genera UN solo archivo SQL para dejar listo un entorno de QA nuevo (por ejemplo, un segundo
 * proyecto de Supabase): la estructura, el catálogo, el inventario base y los usuarios de QA.
 *
 * Uso (desde la carpeta backend):
 *   node src/scripts/generarSqlQA.js <archivo-de-salida> <usuario>:<contraseña>:<Nombre completo> [...]
 *
 * Ejemplo:
 *   node src/scripts/generarSqlQA.js ../qa/entorno-qa.generado.sql \
 *     "qa:UnaClaveLarga123:QA Automático" "oscar-qa:OtraClave456:Oscar (QA)"
 *
 * El archivo generado contiene solo los HASH de las contraseñas (bcrypt), nunca el texto plano,
 * y aun así no se sube al repositorio (está en .gitignore). Se pega completo en el SQL Editor
 * del Supabase de QA y se puede ejecutar varias veces.
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const [salida, ...usuarios] = process.argv.slice(2);
if (!salida || usuarios.length === 0) {
  console.error('Uso: node src/scripts/generarSqlQA.js <archivo-de-salida> <usuario>:<contraseña>:<Nombre completo> [...]');
  process.exit(1);
}

const dirDb = path.join(__dirname, '..', 'db');
const leer = (nombre) => fs.readFileSync(path.join(dirDb, nombre), 'utf8');
const esc = (t) => t.replace(/'/g, "''");

const filasUsuarios = usuarios.map((def) => {
  const [usuario, password, ...resto] = def.split(':');
  const nombre = resto.join(':');
  if (!usuario || !password || !nombre) {
    console.error(`Usuario mal escrito: «${def}». Debe ser usuario:contraseña:Nombre completo`);
    process.exit(1);
  }
  const hash = bcrypt.hashSync(password, 10);
  return `('${esc(usuario)}', '${hash}', '${esc(nombre)}', 'admin')`;
});

const partes = [
  '-- =============================================================================',
  '-- SIGEV: entorno de QA completo (generado con src/scripts/generarSqlQA.js)',
  '-- Pega este archivo entero en el SQL Editor del Supabase de QA. Se puede repetir.',
  '-- Contiene: estructura, catálogo, inventario base y usuarios de QA (solo hashes).',
  '-- =============================================================================',
  '',
  '-- PARTE 1: estructura',
  leer('schema.sql'),
  '',
  '-- PARTE 2: catálogo inicial',
  leer('seeds.sql'),
  '',
  '-- PARTE 3: catálogo del mercado colombiano e inventario base',
  leer('carga-catalogo-mercado-colombiano.sql'),
  '',
  '-- PARTE 4: usuarios de QA (si ya existen, solo se actualiza su contraseña)',
  'INSERT INTO usuarios (usuario, password_hash, nombre_completo, rol)',
  'VALUES',
  filasUsuarios.join(',\n'),
  'ON CONFLICT (usuario) DO UPDATE SET password_hash = EXCLUDED.password_hash;',
  '',
];

fs.writeFileSync(salida, partes.join('\n'));
console.log(`Generado ${salida} con ${usuarios.length} usuario(s) de QA.`);
