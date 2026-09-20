const express = require('express');
const cors = require('cors');
require('dotenv').config();

const eventosRoutes = require('./routes/eventosRoutes');
const catalogoRoutes = require('./routes/catalogoRoutes'); // <-- 1. Importar rutas del catálogo

const app = express();

app.use(cors());
app.use(express.json());

// Rutas de la API
app.use('/api/eventos', eventosRoutes);
app.use('/api/catalogo', catalogoRoutes); // <-- 2. Conectar endpoint del catálogo

// Ruta base de prueba de estado
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mensaje: 'Servidor SIGEV operativo' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend SIGEV escuchando en el puerto ${PORT}`);
});