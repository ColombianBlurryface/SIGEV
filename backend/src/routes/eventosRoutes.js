const { Router } = require('express');
const { crearEvento, listarEventos, obtenerDetalleEvento } = require('../controllers/eventosController');
const { validarCreacionEvento } = require('../middlewares/validarEvento');

const router = Router();

// Rutas de eventos (Sprint 1)
router.post('/', validarCreacionEvento, crearEvento);
router.get('/', listarEventos);
router.get('/:id', obtenerDetalleEvento);

module.exports = router;