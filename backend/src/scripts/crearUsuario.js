/**
 * Script de administración para crear usuarios (o cambiarles la contraseña).
 *
 * SIGEV no tiene registro público a propósito: las cuentas las crea el
 * administrador desde la terminal con este script.
 *
 * Uso (desde la carpeta backend):
 *   node src/scripts/crearUsuario.js <usuario> '<contraseña>' "<Nombre Completo>" [rol]
 *
 * Si el usuario ya existe, solo se actualiza su contraseña.
 * Consejo: escribe la contraseña entre comillas simples para que la terminal
 * no interprete caracteres como !, $ o #.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const crearUsuario = async () => {
  const [usuario, password, nombreCompleto, rol = 'operador'] = process.argv.slice(2);

  if (!usuario || !password || !nombreCompleto) {
    console.error('Uso: node src/scripts/crearUsuario.js <usuario> <password> "<Nombre Completo>" [rol]');
    process.exit(1);
  }

  // Se guarda solo el hash de la contraseña (bcrypt con 10 rondas), nunca el texto plano
  const passwordHash = await bcrypt.hash(password, 10);

  const query = `
    INSERT INTO usuarios (usuario, password_hash, nombre_completo, rol)
    VALUES ($1, $2, $3, $4)
    -- Si el usuario ya existe, solo se reemplaza la contraseña
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
