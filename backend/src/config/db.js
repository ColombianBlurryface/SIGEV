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
  // En Vercel cada instancia de la función tiene su propio pool, así que se mantiene pequeño para
  // no agotar las conexiones del pooler de Supabase. Se puede cambiar con DB_POOL_MAX.
  max: Number(process.env.DB_POOL_MAX) || 5,
  idleTimeoutMillis: 10000,
});

pool.on('connect', () => {
  console.log('Conectado exitosamente a PostgreSQL (SIGEV)');
});

// Si una conexión ociosa del pool falla de forma inesperada, se registra el error. El pool descarta
// esa conexión y abre otra en la siguiente petición. No se detiene el proceso: en una función
// serverless eso tumbaría la instancia que está atendiendo a otras personas.
pool.on('error', (err) => {
  console.error('Error inesperado en el pool de conexiones:', err);
});

module.exports = pool;
