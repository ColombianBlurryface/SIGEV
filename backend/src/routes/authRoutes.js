/**
 * Rutas de autenticación.
 *
 * Solo existe el inicio de sesión: no hay registro público a propósito.
 * Los usuarios se crean desde la terminal con src/scripts/crearUsuario.js.
 */
const { Router } = require('express');
const { login } = require('../controllers/authController');

const router = Router();

// POST /api/auth/login -> recibe { usuario, password } y devuelve un token de sesión
router.post('/login', login);

module.exports = router;
