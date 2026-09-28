/**
 * Rutas del catálogo de productos.
 *
 * El catálogo contiene los alimentos y bebidas con los que el sistema calcula
 * las cantidades de un evento. Los elementos de inventario no aparecen aquí.
 */
const { Router } = require('express');
const {
  obtenerCatalogo,
  obtenerProductoPorId
} = require('../controllers/catalogoController');

const router = Router();

// GET /api/catalogo -> lista todos los productos, o filtra con ?clasificacion=alimento
router.get('/', obtenerCatalogo);

// GET /api/catalogo/:id -> devuelve un producto puntual
router.get('/:id', obtenerProductoPorId);

module.exports = router;
