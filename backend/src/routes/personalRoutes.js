/**
 * Rutas del personal de servicio (HU-26 · RF-33): registrar y listar.
 */
const { Router } = require('express');
const { crearPersonal, listarPersonal } = require('../controllers/personalController');

const router = Router();

// POST /api/personal -> registra un mesero
router.post('/', crearPersonal);

// GET /api/personal -> lista el personal activo (filtro opcional ?rol=mesero)
router.get('/', listarPersonal);

module.exports = router;
