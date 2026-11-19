/**
 * Reglas del registro de un evento. Los límites viven aquí para que el validador (middlewares/validarEvento.js),
 * el controlador y los README digan lo mismo. La pantalla repite las que necesita en frontend/src/lib/reglasEvento.ts
 * y frontend/src/lib/categorias.ts.
 */
const TIPOS_EVENTO = ['Boda', 'Corporativo', 'Quinceañero', 'Gala', 'Cumpleaños', 'Otro'];

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

// RN-18 (RF-06): cada servicio admite de 1 a 5 unidades y sus horas no pueden superar la
// duración del evento (de 3 a 8 horas). Las horas van de media en media hora.
const HORAS_SERVICIO_MIN = 1;
const HORAS_SERVICIO_MAX = 8;
const MAXIMO_UNIDADES_POR_TIPO = {
  dj: 3,
  musica_en_vivo: 3,
  sonido: 2,
  iluminacion: 2,
  entretenimiento: 3,
  otro: 5
};

// Estados posibles de un evento (RF-58 · HU-51)
const ESTADOS_EVENTO = ['planificacion', 'confirmado', 'realizado', 'cancelado'];

const ETIQUETAS_ESTADO = {
  planificacion: 'Planificación',
  confirmado: 'Confirmado',
  realizado: 'Realizado',
  cancelado: 'Cancelado'
};

/**
 * Normaliza cualquier texto de estado a su código canónico en minúsculas.
 * Acepta 'planificacion', 'Planificación', 'confirmado', 'Confirmado', etc.
 */
const normalizarEstadoEvento = (valor) => {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (limpio === 'planificacion') return 'planificacion';
  if (limpio === 'confirmado') return 'confirmado';
  if (limpio === 'realizado') return 'realizado';
  if (limpio === 'cancelado') return 'cancelado';
  return null;
};

/**
 * Valida la transición entre estados de un evento según las reglas de RF-58 (HU-51):
 * - Un evento Cancelado puede volver a Planificación.
 * - Un evento Realizado ya no puede cambiar a ningún otro estado.
 */
const validarTransicionEstado = (estadoActual, nuevoEstado) => {
  if (estadoActual === nuevoEstado) {
    return { valido: true };
  }
  if (estadoActual === 'realizado') {
    return {
      valido: false,
      error: 'Regla de negocio no cumplida (RF-58)',
      detalle: 'Un evento en estado Realizado ya no puede cambiar a ningún otro estado.'
    };
  }
  if (estadoActual === 'cancelado' && nuevoEstado !== 'planificacion') {
    return {
      valido: false,
      error: 'Regla de negocio no cumplida (RF-58)',
      detalle: 'Un evento cancelado solo puede volver al estado de Planificación.'
    };
  }
  return { valido: true };
};

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

module.exports = {
  TIPOS_EVENTO, TIPOS_SERVICIO, ETIQUETA_SERVICIO, LIMITES,
  HORAS_SERVICIO_MIN, HORAS_SERVICIO_MAX, MAXIMO_UNIDADES_POR_TIPO,
  ESTADOS_EVENTO, ETIQUETAS_ESTADO, normalizarEstadoEvento, validarTransicionEstado
};
