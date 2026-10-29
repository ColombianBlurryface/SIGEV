/**
 * Rutas del catálogo de productos.
 *
 * El catálogo contiene los alimentos y bebidas con los que el sistema calcula
 * las cantidades de un evento. Los elementos de inventario no aparecen aquí.
 * Los productos se consultan, se crean, se editan y se activan o desactivan.
 * Los alimentos (platos) además tienen una receta de ingredientes (HU-46).
 */
const { Router } = require('express');
const {
  obtenerCatalogo,
  obtenerProductoPorId,
  crearProducto,
  actualizarProducto,
  cambiarEstadoProducto
} = require('../controllers/catalogoController');
const { obtenerReceta, guardarReceta, listarResumenRecetas, listarIngredientes } = require('../controllers/recetasController');

const router = Router();

// GET /api/catalogo -> lista los productos activos; filtros ?clasificacion=alimento y ?incluir_inactivos=true
router.get('/', obtenerCatalogo);

// POST /api/catalogo -> crea un producto
router.post('/', crearProducto);

// Recetas de los platos (HU-46 · RF-54). Las rutas fijas van antes que /:id para que no se confundan con un id.
router.get('/recetas', listarResumenRecetas);
router.get('/ingredientes', listarIngredientes);
router.get('/:id/receta', obtenerReceta);
router.put('/:id/receta', guardarReceta);

// PATCH /api/catalogo/:id/estado -> activa o desactiva un producto
router.patch('/:id/estado', cambiarEstadoProducto);

// PUT /api/catalogo/:id -> edita los datos de un producto
router.put('/:id', actualizarProducto);

// GET /api/catalogo/:id -> devuelve un producto puntual
router.get('/:id', obtenerProductoPorId);

module.exports = router;
