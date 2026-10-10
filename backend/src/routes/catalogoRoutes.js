/**
 * Rutas del catálogo de productos.
 *
 * El catálogo contiene los alimentos y bebidas con los que el sistema calcula
 * las cantidades de un evento. Los elementos de inventario no aparecen aquí.
 * Los productos se consultan, se crean, se editan y se activan o desactivan.
 */
const { Router } = require('express');
const {
  obtenerCatalogo,
  obtenerProductoPorId,
  crearProducto,
  actualizarProducto,
  cambiarEstadoProducto
} = require('../controllers/catalogoController');

const router = Router();

// GET /api/catalogo -> lista los productos activos; filtros ?clasificacion=alimento y ?incluir_inactivos=true
router.get('/', obtenerCatalogo);

// POST /api/catalogo -> crea un producto
router.post('/', crearProducto);

// PATCH /api/catalogo/:id/estado -> activa o desactiva un producto
router.patch('/:id/estado', cambiarEstadoProducto);

// PUT /api/catalogo/:id -> edita los datos de un producto
router.put('/:id', actualizarProducto);

// GET /api/catalogo/:id -> devuelve un producto puntual
router.get('/:id', obtenerProductoPorId);

module.exports = router;
