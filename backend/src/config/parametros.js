/**
 * Parámetros del sistema que pueden cambiar sin tocar el código.
 *
 * UMBRAL_ALQUILER (P-05, RN-03): con más asistentes que este número se avisa que probablemente
 * haya que alquilar mobiliario. Se define con la variable de entorno MAX_OWNED_CAPACITY_THRESHOLD
 * (por ejemplo, si el cliente compra más inventario y el límite sube a 300, solo se cambia el
 * .env y se reinicia el servidor). Si no está definida o no es válida, se usa 200.
 */
require('dotenv').config();

const UMBRAL_ALQUILER_POR_DEFECTO = 200;

const leerUmbral = () => {
  const valor = Number(process.env.MAX_OWNED_CAPACITY_THRESHOLD);
  return Number.isInteger(valor) && valor > 0 ? valor : UMBRAL_ALQUILER_POR_DEFECTO;
};

module.exports = { UMBRAL_ALQUILER: leerUmbral() };
