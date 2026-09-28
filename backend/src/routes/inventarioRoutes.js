const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');

// POST /api/inventario - HU-08: Registrar elemento de inventario
router.post('/', inventarioController.registrarElemento);

module.exports = router;