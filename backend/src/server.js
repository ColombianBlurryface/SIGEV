/**
 * Punto de entrada del backend de SIGEV.
 *
 * Levanta un servidor Express que expone la API REST bajo el prefijo /api.
 * Cada módulo (autenticación, eventos, catálogo e inventario) tiene su propio
 * archivo de rutas en ./routes, y la lógica de cada ruta vive en ./controllers.
 */
const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Carga las variables de backend/.env (base de datos, puerto, JWT_SECRET)

const authRoutes = require('./routes/authRoutes');
const eventosRoutes = require('./routes/eventosRoutes');
const catalogoRoutes = require('./routes/catalogoRoutes');
const inventarioRoutes = require('./routes/inventarioRoutes');

const app = express();

// Permite que el frontend (que corre en otro puerto u origen) llame a esta API
app.use(cors());

// Convierte automáticamente el cuerpo JSON de cada petición en req.body
app.use(express.json());

// Rutas de la API, agrupadas por módulo
app.use('/api/auth', authRoutes); // Inicio de sesión
app.use('/api/eventos', eventosRoutes); // Registro y consulta de eventos
app.use('/api/catalogo', catalogoRoutes); // Productos usados en el cálculo de eventos
app.use('/api/inventario', inventarioRoutes); // Inventario propio y sus movimientos

// Ruta simple para comprobar que el servidor está encendido
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mensaje: 'Servidor SIGEV operativo' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend SIGEV escuchando en el puerto ${PORT}`);
});
