/**
 * Entrada de la API en Vercel.
 *
 * Vercel convierte cada archivo de la carpeta api/ en una función serverless. Esta solo
 * reexporta la aplicación Express de src/server.js: con las reglas de vercel.json, todas las
 * peticiones llegan aquí y Express las reparte entre sus rutas (/api/eventos, /api/inventario…).
 */
module.exports = require('../src/server');
