/**
 * Límites de las medidas del catálogo y de los eventos. Deben coincidir con el backend
 * (catalogoController.js y validarEvento.js); aquí se usan para avisar mientras se escribe.
 */
export const GRAMOS_POR_PERSONA_MAX = 1000 // un alimento no pasa de 1 kg por persona
export const BOTELLA_ML_MAX = 5000 // la botella más grande que se maneja: 5 litros
export const PRECIO_MAX = 100_000_000
