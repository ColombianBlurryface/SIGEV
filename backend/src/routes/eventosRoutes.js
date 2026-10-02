/**
 * Rutas de eventos.
 *
 * Crear un evento pasa primero por el middleware validarCreacionEvento,
 * que revisa los datos básicos antes de llegar al controlador.
 */
const { Router } = require('express');
const { crearEvento, listarEventos, obtenerDetalleEvento } = require('../controllers/eventosController');
const { validarCreacionEvento } = require('../middlewares/validarEvento');

const router = Router();

// POST /api/eventos -> registra un evento con sus productos y servicios adicionales
router.post('/', validarCreacionEvento, crearEvento);

// GET /api/eventos -> lista todos los eventos ordenados por fecha
router.get('/', listarEventos);

// GET /api/eventos/:id -> detalle de un evento con sus requerimientos calculados
router.get('/:id', obtenerDetalleEvento);

module.exports = router;
