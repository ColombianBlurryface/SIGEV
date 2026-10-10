/**
 * Ruta de solo lectura con los parámetros del sistema que el frontend necesita conocer.
 * Así el umbral de alquiler (P-05) vive en un solo lugar, el backend, y no se repite en la pantalla.
 */
const express = require('express');
const router = express.Router();
const { UMBRAL_ALQUILER } = require('../config/parametros');

// GET /api/configuracion - Parámetros vigentes del sistema
router.get('/', (req, res) => {
  res.json({ umbral_alquiler: UMBRAL_ALQUILER });
});

module.exports = router;
