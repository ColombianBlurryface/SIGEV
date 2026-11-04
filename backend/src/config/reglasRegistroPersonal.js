/**
 * Reglas del registro de personal de servicio (HU-26 · RF-33). Hoy solo meseros. La pantalla repite lo necesario en
 * frontend/src/lib/reglasRegistroPersonal.ts.
 *
 * Un mesero se registra con su nombre completo y un dato de contacto de texto libre: un teléfono, un correo o ambos
 * («carlos.r@email.com / +57 300 123 4567»). Se revisa que el nombre sea un nombre (letras, sin números) y que el
 * contacto traiga de verdad un teléfono (mínimo 7 dígitos) o un correo, no cualquier texto.
 */
const ROLES = ['mesero'];            // el rol «cocinero» existe en la tabla pero todavía no tiene su historia
const ROL_POR_DEFECTO = 'mesero';
const ALIAS_ROL = { mesero: 'mesero', waiter: 'mesero' }; // WAITER es el nombre de la historia

const NOMBRE_MIN = 2;
const NOMBRE_MAX = 150;
const CONTACTO_MAX = 150;
const DIGITOS_TELEFONO_MIN = 7;

const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const limpiar = (texto) => texto.replace(/\s+/g, ' ').trim();

// Letras de cualquier idioma (con tildes y ñ), espacios, apóstrofo, punto y guion: «María-José O'Brien Jr.»
const NOMBRE_VALIDO = /^[\p{L}\p{M}][\p{L}\p{M}'’.\- ]*$/u;
// Un teléfono, un correo o ambos, con separadores comunes; nada de símbolos raros ni etiquetas
const CONTACTO_VALIDO = /^[\p{L}\p{N}\p{M} +\-()./@_,:;#]+$/u;
const CORREO = /[^\s@/]+@[^\s@/]+\.[^\s@/]{2,}/;

/** Texto de un rol (MESERO, waiter, mesero…) → su código, o null si no es un rol permitido. */
const normalizarRol = (valor) => (typeof valor === 'string' ? ALIAS_ROL[valor.trim().toLowerCase()] || null : null);

/** Revisa { nombre_completo, contacto, rol? }. Devuelve { error } con el motivo o los datos limpios. */
const validarPersonal = (body) => {
  if (!esObjeto(body)) return { error: 'El cuerpo de la petición debe ser un objeto JSON.' };

  let rol = ROL_POR_DEFECTO;
  if (body.rol !== undefined && body.rol !== null) {
    rol = normalizarRol(body.rol);
    if (!rol) return { error: `El rol debe ser uno de: ${ROLES.join(', ')}.` };
  }

  if (typeof body.nombre_completo !== 'string' || limpiar(body.nombre_completo) === '') {
    return { error: 'El nombre completo es obligatorio.' };
  }
  const nombre = limpiar(body.nombre_completo);
  if (nombre.length < NOMBRE_MIN || nombre.length > NOMBRE_MAX) {
    return { error: `El nombre completo debe tener de ${NOMBRE_MIN} a ${NOMBRE_MAX} caracteres.` };
  }
  if (!NOMBRE_VALIDO.test(nombre)) {
    return { error: 'El nombre solo puede tener letras, espacios, apóstrofos, puntos y guiones (sin números).' };
  }

  if (typeof body.contacto !== 'string' || limpiar(body.contacto) === '') {
    return { error: 'El contacto es obligatorio.' };
  }
  const contacto = limpiar(body.contacto);
  if (contacto.length > CONTACTO_MAX) return { error: `El contacto admite máximo ${CONTACTO_MAX} caracteres.` };
  const digitos = (contacto.match(/\d/g) || []).length;
  if (!CONTACTO_VALIDO.test(contacto) || (!CORREO.test(contacto) && digitos < DIGITOS_TELEFONO_MIN)) {
    return { error: `El contacto debe incluir un teléfono (mínimo ${DIGITOS_TELEFONO_MIN} dígitos) o un correo válido.` };
  }

  return { nombre_completo: nombre, contacto, rol };
};

module.exports = {
  ROLES, ROL_POR_DEFECTO, NOMBRE_MIN, NOMBRE_MAX, CONTACTO_MAX, DIGITOS_TELEFONO_MIN,
  normalizarRol, validarPersonal
};
