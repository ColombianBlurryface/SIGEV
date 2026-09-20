// backend/src/routes/catalogoRoutes.js
const { Router } = require('express');
const {
  obtenerCatalogo,
  obtenerProductoPorId
} = require('../controllers/catalogoController');

const router = Router();

// GET /api/catalogo -> Listar todos o filtrar (?clasificacion=alimento)
router.get('/', obtenerCatalogo);

// GET /api/catalogo/:id -> Obtener un producto puntual
router.get('/:id', obtenerProductoPorId);

module.exports = router;