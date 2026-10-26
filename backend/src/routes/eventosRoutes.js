/**
 * Rutas de eventos.
 *
 * Crear un evento pasa primero por el middleware validarCreacionEvento,
 * que revisa los datos básicos antes de llegar al controlador.
 */
const { Router } = require('express');
const { crearEvento, listarEventos, obtenerDetalleEvento } = require('../controllers/eventosController');
const { validarCreacionEvento } = require('../middlewares/validarEvento');
const { calcularComprasPrevio } = require('../controllers/comprasController');

const router = Router();

// POST /api/eventos -> registra un evento con sus productos y servicios adicionales
router.post('/', validarCreacionEvento, crearEvento);

// POST /api/eventos/calcular-compras -> ingredientes a comprar de unos platos y unos asistentes, antes de guardar (HU-47)
router.post('/calcular-compras', calcularComprasPrevio);

// GET /api/eventos -> lista todos los eventos ordenados por fecha
router.get('/', listarEventos);

// GET /api/eventos/:id -> detalle de un evento con sus requerimientos calculados
router.get('/:id', obtenerDetalleEvento);

module.exports = router;
