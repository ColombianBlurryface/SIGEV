/**
 * Rutas del inventario propio (HU-08) y de sus movimientos (HU-09).
 *
 * Importante: /movimientos se declara antes de las rutas con /:id para que
 * Express no confunda la palabra "movimientos" con un id.
 */
const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');

// POST /api/inventario - HU-08 (RF-09): Registrar elemento de inventario
router.post('/', inventarioController.registrarElemento);

// GET /api/inventario?categoria= - HU-08: Consultar inventario
router.get('/', inventarioController.consultarInventario);

// PATCH /api/inventario/:id/cantidad - HU-08 (RF-11): Actualizar cantidad disponible (queda como ajuste)
router.patch('/:id/cantidad', inventarioController.actualizarCantidad);

// GET /api/inventario/movimientos?elemento_id=&tipo=&limite= - HU-09: Historial de adquisiciones y ajustes
router.get('/movimientos', inventarioController.consultarMovimientos);

// POST /api/inventario/:id/adquisiciones - HU-09 (RF-13): Registrar adquisición de un elemento existente
router.post('/:id/adquisiciones', inventarioController.registrarAdquisicion);

module.exports = router;
