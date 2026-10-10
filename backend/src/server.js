/**
 * Punto de entrada del backend de SIGEV.
 *
 * Define la aplicación Express que expone la API REST bajo el prefijo /api.
 * Cada módulo (autenticación, eventos, catálogo e inventario) tiene su propio
 * archivo de rutas en ./routes, y la lógica de cada ruta vive en ./controllers.
 *
 * Se puede usar de dos formas:
 *   - En local o en un servidor propio: `node src/server.js` levanta el puerto.
 *   - En Vercel: la función `api/index.js` importa esta misma aplicación; allí no se
 *     abre ningún puerto, Vercel entrega cada petición a la aplicación.
 *
 * Seguridad: solo /api/auth/login y /api/health son públicas. Todo lo demás exige el
 * token de sesión (cabecera Authorization: Bearer <token>).
 */
const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Carga las variables de backend/.env (base de datos, puerto, JWT_SECRET)

const authRoutes = require('./routes/authRoutes');
const eventosRoutes = require('./routes/eventosRoutes');
const catalogoRoutes = require('./routes/catalogoRoutes');
const inventarioRoutes = require('./routes/inventarioRoutes');
const configuracionRoutes = require('./routes/configuracionRoutes');
const { verificarToken } = require('./middlewares/verificarToken');

const app = express();

// Permite que el frontend (que corre en otro puerto u origen) llame a esta API.
// CORS_ORIGIN (opcional) limita qué sitios pueden hacerlo: una lista separada por comas, por
// ejemplo "https://sigev-nine.vercel.app,http://localhost:5173". Sin definirla, acepta cualquiera.
const origenesPermitidos = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);
app.use(cors(origenesPermitidos.length ? { origin: origenesPermitidos } : undefined));

// Convierte automáticamente el cuerpo JSON de cada petición en req.body
app.use(express.json());

// Rutas de la API, agrupadas por módulo
app.use('/api/auth', authRoutes); // Inicio de sesión (pública: de aquí sale el token)

// Todo lo demás exige sesión: sin token válido responde 401
app.use('/api/eventos', verificarToken, eventosRoutes); // Registro y consulta de eventos
app.use('/api/catalogo', verificarToken, catalogoRoutes); // Productos usados en el cálculo de eventos
app.use('/api/inventario', verificarToken, inventarioRoutes); // Inventario propio y sus movimientos
app.use('/api/configuracion', verificarToken, configuracionRoutes); // Parámetros del sistema (umbral de alquiler)

// Ruta simple para comprobar que el servidor está encendido
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mensaje: 'Servidor SIGEV operativo' });
});

if (!process.env.JWT_SECRET) {
  console.warn('Aviso: JWT_SECRET no está definida; nadie podrá iniciar sesión.');
}

// Solo se abre el puerto cuando el archivo se ejecuta directamente (node src/server.js).
// En Vercel, api/index.js importa la aplicación y Vercel se encarga de las peticiones.
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Backend SIGEV escuchando en el puerto ${PORT}`);
  });
}

module.exports = app;
