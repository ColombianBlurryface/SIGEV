const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');

// POST /api/inventario - HU-08: Registrar elemento de inventario
router.post('/', inventarioController.registrarElemento);
router.get('/', inventarioController.consultarInventario);
module.exports = router;