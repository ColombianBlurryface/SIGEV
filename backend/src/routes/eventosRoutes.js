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
const { listarMeserosDelEvento, listarMeserosDisponibles, asignarMeseros, cambiarEstadoAsignacion, listarChecklistMeseros } = require('../controllers/asignacionMeserosController');
const { obtenerDesviacionesPersonal } = require('../controllers/desviacionesPersonalController');

const router = Router();

// POST /api/eventos -> registra un evento con sus productos y servicios adicionales
router.post('/', validarCreacionEvento, crearEvento);

// POST /api/eventos/calcular-compras -> ingredientes a comprar de unos platos y unos asistentes, antes de guardar (HU-47)
router.post('/calcular-compras', calcularComprasPrevio);

// GET /api/eventos -> lista todos los eventos ordenados por fecha
router.get('/', listarEventos);

// Meseros asignados a un evento (HU-28 · RF-35). PUT y POST hacen lo mismo: sincronizar la lista completa.
router.get('/:id/meseros', listarMeserosDelEvento);
router.get('/:id/meseros/disponibles', listarMeserosDisponibles);
router.put('/:id/meseros', asignarMeseros);
router.post('/:id/meseros', asignarMeseros);
// Estado de una asignación (HU-29 · RF-36): por_confirmar | confirmado | no_puede (también PENDING | CONFIRMED | UNAVAILABLE)
router.patch('/:id/meseros/:personalId/estado', cambiarEstadoAsignacion);
router.patch('/:id/staff/:personalId/status', cambiarEstadoAsignacion);
// Lista de meseros programados del evento, para el checklist (HU-30 · RF-37)
router.get('/:id/staff/waiters', listarChecklistMeseros);

// Desviaciones y alertas de personal (HU-25 · RF-32)
router.get('/:id/desviaciones-personal', obtenerDesviacionesPersonal);
router.get('/:id/desviaciones', obtenerDesviacionesPersonal);
router.get('/:id/staff-deviations', obtenerDesviacionesPersonal);

// GET /api/eventos/:id -> detalle de un evento con sus requerimientos calculados
router.get('/:id', obtenerDetalleEvento);

module.exports = router;
