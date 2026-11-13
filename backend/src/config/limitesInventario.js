/**
 * Máximo de unidades por elemento del inventario, según su categoría (RF-11, RF-13, RN-16).
 *
 * Evita errores de digitación como registrar 1 millón de sillas o adquirir 100.000 unidades de
 * cualquier cosa. El límite es por ELEMENTO (por ejemplo, «Silla Tiffany»), no por categoría
 * completa, y se aplica al registrar, al actualizar la cantidad y al adquirir. Debe coincidir con
 * frontend/src/lib/inventario.ts.
 *
 * También dice qué categorías se pueden alquilar (RF-14, RN-17): solo mobiliario y vajilla.
 */
const MAXIMO_POR_CATEGORIA = {
    'Mobiliario': 2000,
    'Vajilla': 6000,
    'Bar/Bebidas': 4000,
    'Bebidas de Coctelería': 4000
};

// Nombre con el que se ve cada categoría en pantalla; sirve para que los mensajes digan lo mismo que la interfaz
const ETIQUETA_CATEGORIA = {
    'Mobiliario': 'Mobiliario',
    'Vajilla': 'Vajilla',
    'Bar/Bebidas': 'Bebidas Generales',
    'Bebidas de Coctelería': 'Licores para Cócteles'
};

// RN-17: solo se alquila mobiliario y vajilla. Las bebidas (generales y licores) siempre son propias.
const CATEGORIAS_ALQUILABLES = ['Mobiliario', 'Vajilla'];

// 2000 -> «2.000» (se escribe a mano para no depender de los datos de idioma de Node)
const formatearCantidad = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

module.exports = { MAXIMO_POR_CATEGORIA, ETIQUETA_CATEGORIA, CATEGORIAS_ALQUILABLES, formatearCantidad };
