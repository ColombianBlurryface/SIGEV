/**
 * Reglas del registro de un evento. Los límites viven aquí para que el validador (middlewares/validarEvento.js),
 * el controlador y los README digan lo mismo. La pantalla repite las que necesita en frontend/src/lib/reglasEvento.ts
 * y frontend/src/lib/categorias.ts.
 */
const TIPOS_EVENTO = ['Boda', 'Corporativo', 'Quinceañero', 'Gala', 'Cumpleaños', 'Otro'];

// Tipo de servicio de comida (HU-22): valores guardados. Los nombres y la regla de cocineros están en reglasPersonal.js
const TIPOS_SERVICIO_COMIDA = ['cena', 'coctel', 'buffet', 'refrigerio', 'otro'];

// Tipos de servicio adicional (además de 'mobiliario', que tiene su propia lógica con el inventario)
const ETIQUETA_SERVICIO = {
  dj: 'DJ',
  musica_en_vivo: 'Música en vivo',
  sonido: 'Sonido',
  iluminacion: 'Iluminación',
  entretenimiento: 'Entretenimiento',
  otro: 'Otro'
};
const TIPOS_SERVICIO = Object.keys(ETIQUETA_SERVICIO);

// RN-18 (RF-06): cada servicio admite de 1 a 5 unidades (no hay «DJ ilimitados») y sus horas no pueden superar la
// duración del evento (no hay 300 horas de DJ en un evento de 3). Las horas van de media en media hora.

const LIMITES = {
  anticipacionAnios: 5,        // un evento no se registra para más de 5 años adelante
  observacionesMax: 2000,      // caracteres
  descripcionServicioMax: 300, // caracteres
  notasMax: 300,               // caracteres
  componentesMenuMax: 500,     // caracteres
  unidadesServicioMin: 1,      // unidades de cada servicio
  unidadesServicioMax: 5,
  productosMax: 100,           // líneas de alimentos y bebidas por evento
  serviciosMax: 100,           // líneas de mobiliario y servicios por evento
  gramosPorPersonaMax: 1000    // un alimento no pasa de 1 kg por persona
};

module.exports = { TIPOS_EVENTO, TIPOS_SERVICIO_COMIDA, TIPOS_SERVICIO, ETIQUETA_SERVICIO, LIMITES };
