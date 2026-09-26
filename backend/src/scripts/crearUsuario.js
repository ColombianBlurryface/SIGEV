// Script de administración: crea (o actualiza la contraseña de) un usuario directo en la BD.
// No existe endpoint público de registro a propósito.
//
// Uso: node src/scripts/crearUsuario.js <usuario> <password> "<Nombre Completo>" [rol]
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const crearUsuario = async () => {
  const [usuario, password, nombreCompleto, rol = 'operador'] = process.argv.slice(2);

  if (!usuario || !password || !nombreCompleto) {
    console.error('Uso: node src/scripts/crearUsuario.js <usuario> <password> "<Nombre Completo>" [rol]');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const query = `
    INSERT INTO usuarios (usuario, password_hash, nombre_completo, rol)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (usuario) DO UPDATE SET password_hash = EXCLUDED.password_hash
    RETURNING id, usuario, nombre_completo, rol;
  `;

  const resultado = await pool.query(query, [usuario, passwordHash, nombreCompleto, rol]);
  console.log('Usuario creado/actualizado:', resultado.rows[0]);
  await pool.end();
};

crearUsuario().catch((error) => {
  console.error('Error al crear el usuario:', error.message);
  process.exit(1);
});
