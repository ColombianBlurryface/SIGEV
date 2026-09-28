/**
 * Conexión a la base de datos PostgreSQL (Supabase en el equipo, o un Postgres local).
 *
 * Se usa un "pool": un grupo de conexiones abiertas que se reutilizan entre peticiones,
 * en lugar de abrir y cerrar una conexión cada vez. Todos los controladores importan
 * este mismo pool para ejecutar sus consultas.
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  // Supabase exige conexión cifrada (SSL); un Postgres local normalmente no.
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => {
  console.log('Conectado exitosamente a PostgreSQL (SIGEV)');
});

// Si una conexión del pool falla de forma inesperada, se detiene el servidor
// para no seguir respondiendo con una base de datos en mal estado.
pool.on('error', (err) => {
  console.error('Error inesperado en el pool de conexiones:', err);
  process.exit(-1);
});

module.exports = pool;
