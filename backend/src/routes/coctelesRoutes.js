const express = require('express');
const router = express.Router();
const coctelesController = require('../controllers/coctelesController');

// HU-44 (RF-52): Recetas de cóctel
router.get('/', coctelesController.listarCocteles);
router.get('/:id', coctelesController.obtenerCoctelPorId);
router.post('/', coctelesController.crearCoctel);
router.put('/:id', coctelesController.editarCoctel);
router.delete('/:id', coctelesController.eliminarCoctel);
module.exports = router;