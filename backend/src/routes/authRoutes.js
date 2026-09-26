const { Router } = require('express');
const { login } = require('../controllers/authController');

const router = Router();

// POST /api/auth/login -> única puerta de entrada. No hay POST /register a propósito.
router.post('/login', login);

module.exports = router;
