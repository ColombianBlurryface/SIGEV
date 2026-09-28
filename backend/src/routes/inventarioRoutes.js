const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');

// POST /api/inventario - HU-08 (RF-09): Registrar elemento de inventario
router.post('/', inventarioController.registrarElemento);

// GET /api/inventario?categoria= - HU-08 / HU-09: Consultar inventario
router.get('/', inventarioController.consultarInventario);

// PATCH /api/inventario/:id/cantidad - HU-08 (RF-11): Actualizar cantidad disponible
router.patch('/:id/cantidad', inventarioController.actualizarCantidad);

module.exports = router;
