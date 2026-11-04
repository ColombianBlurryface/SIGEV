/**
 * Rutas del personal de servicio: registrar y listar (HU-26 · RF-33) y eliminar (HU-27 · RF-34).
 * NO hay PUT ni PATCH: los datos de un mesero no se modifican (si hubo un error, se elimina y se vuelve a registrar).
 */
const { Router } = require('express');
const { crearPersonal, listarPersonal, eliminarPersonal, metodoNoPermitido } = require('../controllers/personalController');

const router = Router();

// POST /api/personal -> registra un mesero
router.post('/', crearPersonal);

// GET /api/personal -> lista el personal activo (filtro opcional ?rol=mesero)
router.get('/', listarPersonal);

// DELETE /api/personal/:id -> elimina un mesero (borrado lógico)
router.delete('/:id', eliminarPersonal);

// Cualquier otro método sobre /:id responde 405 con «Allow: DELETE»
router.all('/:id', metodoNoPermitido);

module.exports = router;
