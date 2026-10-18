/**
 * Middleware que valida TODA la petición de registrar un evento antes de llegar al controlador:
 * los datos básicos, los productos (alimentos y bebidas) y los servicios adicionales (mobiliario, DJ...).
 *
 * Se ejecuta antes de crearEvento (ver routes/eventosRoutes.js). Si algo no cumple las reglas responde 400
 * con el motivo y no se guarda nada. Lo que depende de la base de datos (que el producto exista, que el
 * elemento sea mobiliario, las porciones según el tipo de cálculo) lo revisa el controlador.
 */
const { MAXIMO_POR_CATEGORIA, formatearCantidad } = require('../config/limitesInventario');
const { TIPOS_EVENTO, TIPOS_SERVICIO_COMIDA, TIPOS_SERVICIO, ETIQUETA_SERVICIO, LIMITES } = require('../config/reglasEvento');

const rechazar = (res, detalle, error = 'Datos inválidos') => res.status(400).json({ error, detalle });

const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const esEnteroPositivo = (v) => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 2147483647;
const hayValor = (v) => v !== undefined && v !== null;
const sumarAnios = (iso, anios) => `${Number(iso.slice(0, 4)) + anios}${iso.slice(4)}`;

const validarCreacionEvento = (req, res, next) => {
  if (!esObjeto(req.body)) return rechazar(res, 'El cuerpo de la petición debe ser un objeto JSON.');
  const {
    nombre_evento, fecha_evento, tipo_evento, tipo_servicio, duracion_horas, asistentes, observaciones_generales,
    productos, servicios_adicionales
  } = req.body;

  // Campos base (RF-01, RF-02)
  if (!nombre_evento || !fecha_evento || !tipo_evento || !duracion_horas || asistentes === undefined) {
    return rechazar(res, 'nombre_evento, fecha_evento, tipo_evento, duracion_horas y asistentes son obligatorios.', 'Campos requeridos faltantes');
  }

  // El nombre: texto con contenido y máximo 150 caracteres (límite de la columna)
  if (typeof nombre_evento !== 'string' || !nombre_evento.trim() || nombre_evento.trim().length > 150) {
    return rechazar(res, 'El nombre del evento es obligatorio y admite máximo 150 caracteres.');
  }

  // El tipo es uno de la lista que ofrece la pantalla
  if (!TIPOS_EVENTO.includes(tipo_evento)) {
    return rechazar(res, `El tipo de evento debe ser uno de: ${TIPOS_EVENTO.join(', ')}.`);
  }

  // El tipo de servicio de comida (HU-22) es obligatorio y uno de la lista: de él depende el cálculo de cocineros (RN-05)
  if (!TIPOS_SERVICIO_COMIDA.includes(tipo_servicio)) {
    return rechazar(res, `El tipo de servicio debe ser uno de: ${TIPOS_SERVICIO_COMIDA.join(', ')}.`, 'Campos requeridos faltantes');
  }

  // La fecha debe ser un día real con formato AAAA-MM-DD («2026-13-45» o «mañana» no lo son)
  const esFechaReal = typeof fecha_evento === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha_evento) &&
    !Number.isNaN(Date.parse(fecha_evento)) && new Date(fecha_evento).toISOString().slice(0, 10) === fecha_evento;
  if (!esFechaReal) {
    return rechazar(res, 'La fecha del evento debe ser un día real con el formato AAAA-MM-DD.');
  }
  // La fecha debe ser hoy o posterior (RF-02, RN-14) y no pasar de 5 años adelante
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }); // 'AAAA-MM-DD'
  if (fecha_evento < hoy) {
    return rechazar(res, 'La fecha del evento debe ser el día actual o posterior.', 'Regla de negocio no cumplida (RN-14 / RF-02)');
  }
  if (fecha_evento > sumarAnios(hoy, LIMITES.anticipacionAnios)) {
    return rechazar(res, `La fecha del evento no puede ser más de ${LIMITES.anticipacionAnios} años en el futuro.`);
  }

  // Un evento debe tener entre 40 y 600 asistentes (RF-08, RN-01). Number (y no parseInt) para que «100.5» o «100 personas» no pasen
  const cantAsistentes = Number(asistentes);
  if (!Number.isInteger(cantAsistentes) || cantAsistentes < 40 || cantAsistentes > 600) {
    return rechazar(res, 'La cantidad de asistentes debe estar en el rango de 40 a 600 personas.', 'Regla de negocio no cumplida (RN-01 / RF-08)');
  }

  // La duración debe estar entre 3 y 8 horas (RF-02, RN-14). Number (y no parseFloat) para que «4 horas» no pase como 4
  const duracion = Number(duracion_horas);
  if (!Number.isFinite(duracion) || duracion < 3 || duracion > 8) {
    return rechazar(res, 'La duración en horas debe estar entre 3 y 8 horas.', 'Duración inválida');
  }

  if (hayValor(observaciones_generales) &&
      (typeof observaciones_generales !== 'string' || observaciones_generales.length > LIMITES.observacionesMax)) {
    return rechazar(res, `Las observaciones deben ser texto de máximo ${formatearCantidad(LIMITES.observacionesMax)} caracteres.`);
  }

  // ---- Alimentos y bebidas del catálogo ----
  if (hayValor(productos)) {
    if (!Array.isArray(productos) || productos.length > LIMITES.productosMax) {
      return rechazar(res, `productos debe ser una lista de máximo ${LIMITES.productosMax} elementos.`);
    }
    const vistos = new Set();
    for (const [i, item] of productos.entries()) {
      if (!esObjeto(item)) return rechazar(res, `El producto ${i + 1} de la lista no es válido.`);
      const id = typeof item.producto_id === 'string' && /^\d+$/.test(item.producto_id) ? Number(item.producto_id) : item.producto_id;
      if (!esEnteroPositivo(id)) return rechazar(res, `El producto ${i + 1} no tiene un producto_id válido (debe ser un número entero).`);
      if (vistos.has(id)) return rechazar(res, 'El mismo producto está repetido en el evento: cada alimento o bebida se agrega una sola vez.');
      vistos.add(id);
      // La porción enviada se revisa con más detalle en el controlador, porque sus límites dependen del tipo de cálculo
      if (hayValor(item.porcion_por_persona) && typeof item.porcion_por_persona !== 'number' && typeof item.porcion_por_persona !== 'string') {
        return rechazar(res, `La porción por persona del producto ${i + 1} no es válida.`);
      }
      if (hayValor(item.precio_unitario) && !(typeof item.precio_unitario === 'number' && Number.isFinite(item.precio_unitario) && item.precio_unitario >= 0)) {
        return rechazar(res, `El valor unitario del producto ${i + 1} debe ser un número mayor o igual a 0.`);
      }
      if (hayValor(item.componentes_menu) && (typeof item.componentes_menu !== 'string' || item.componentes_menu.length > LIMITES.componentesMenuMax)) {
        return rechazar(res, `Los componentes del menú admiten máximo ${LIMITES.componentesMenuMax} caracteres.`);
      }
    }
  }

  // ---- Mobiliario y servicios adicionales ----
  if (hayValor(servicios_adicionales)) {
    if (!Array.isArray(servicios_adicionales) || servicios_adicionales.length > LIMITES.serviciosMax) {
      return rechazar(res, `servicios_adicionales debe ser una lista de máximo ${LIMITES.serviciosMax} elementos.`);
    }
    for (const [i, s] of servicios_adicionales.entries()) {
      if (!esObjeto(s)) return rechazar(res, `El requerimiento ${i + 1} de la lista no es válido.`);
      const esMobiliario = s.tipo === 'mobiliario';
      if (!esMobiliario && !TIPOS_SERVICIO.includes(s.tipo)) {
        return rechazar(res, `El tipo del requerimiento ${i + 1} debe ser mobiliario o uno de: ${TIPOS_SERVICIO.join(', ')}.`);
      }
      const delInventario = esMobiliario && hayValor(s.producto_id);
      if (delInventario && !esEnteroPositivo(s.producto_id)) {
        return rechazar(res, `El elemento de inventario del requerimiento ${i + 1} no es válido.`);
      }
      // La descripción es obligatoria (salvo el mobiliario del inventario, que usa el nombre del elemento)
      if (!delInventario) {
        if (typeof s.descripcion !== 'string' || !s.descripcion.trim() || s.descripcion.trim().length > LIMITES.descripcionServicioMax) {
          return rechazar(res, `La descripción del requerimiento ${i + 1} es obligatoria y admite máximo ${LIMITES.descripcionServicioMax} caracteres.`);
        }
      } else if (hayValor(s.descripcion) && (typeof s.descripcion !== 'string' || s.descripcion.length > LIMITES.descripcionServicioMax)) {
        return rechazar(res, `La descripción del requerimiento ${i + 1} admite máximo ${LIMITES.descripcionServicioMax} caracteres.`);
      }
      if (hayValor(s.notas) && (typeof s.notas !== 'string' || s.notas.length > LIMITES.notasMax)) {
        return rechazar(res, `Las notas del requerimiento ${i + 1} admiten máximo ${LIMITES.notasMax} caracteres.`);
      }

      const cantidad = s.cantidad;
      if (esMobiliario) {
        // RF-14, RN-17: lo que se pide de mobiliario es un entero de 1 hasta el máximo por elemento
        const maximo = MAXIMO_POR_CATEGORIA['Mobiliario'];
        if (!esEnteroPositivo(cantidad) || cantidad > maximo) {
          return rechazar(res, `La cantidad de mobiliario debe ser un número entero de 1 a ${formatearCantidad(maximo)}.`);
        }
      } else {
        // RN-18 (RF-06): cada servicio admite de 1 a 5 unidades y sus horas no pueden superar la duración del evento
        const etiqueta = ETIQUETA_SERVICIO[s.tipo];
        const { unidadesServicioMin: minU, unidadesServicioMax: maxU } = LIMITES;
        if (!esEnteroPositivo(cantidad) || cantidad < minU || cantidad > maxU) {
          return rechazar(res, `Las unidades del servicio «${etiqueta}» deben ser un número entero de ${minU} a ${maxU}.`, 'Regla de negocio no cumplida (RN-18)');
        }
        const horas = s.horas;
        if (typeof horas !== 'number' || !Number.isFinite(horas) || horas <= 0 || !Number.isInteger(horas * 2)) {
          return rechazar(res, `Las horas del servicio «${etiqueta}» deben ser un número mayor a 0, en horas completas o medias horas.`, 'Regla de negocio no cumplida (RN-18)');
        }
        if (horas > duracion) {
          return rechazar(
            res,
            `El servicio «${etiqueta}» no puede durar más que el evento: el evento dura ${duracion} ${duracion === 1 ? 'hora' : 'horas'} y se pidieron ${horas}.`,
            'Regla de negocio no cumplida (RN-18)'
          );
        }
      }
    }
  }

  next();
};

module.exports = { validarCreacionEvento };
