/**
 * Controlador de eventos.
 *
 * Aquí está el "motor de cálculo" de SIGEV: al registrar un evento, calcula cuánto
 * se necesita de cada alimento y bebida según el número de asistentes, con un
 * margen de seguridad del 10%. También guarda los servicios adicionales y el
 * mobiliario, calculando los costos de servicios según su modalidad (HU-48).
 * Al consultar un evento, compara su mobiliario con el inventario para saber
 * qué es propio y qué hay que alquilar (HU-12).
 */
const pool = require('../config/db');
const { esUnidadesPorPersonaValida } = require('../config/reglasBebidas');
const { MAXIMO_POR_CATEGORIA, formatearCantidad } = require('../config/limitesInventario');
const { LIMITES, normalizarEstadoEvento, validarTransicionEstado } = require('../config/reglasEvento');
const {
  ASISTENTES_POR_MESERO, calcularMeseros,
  ASISTENTES_POR_GRUPO_COCINA, COCINEROS_POR_GRUPO, calcularCocineros
} = require('../config/reglasPersonal');

// Redondea hacia arriba evitando errores de precisión decimal de JavaScript.
const redondearArriba = (valor) => Math.ceil(Number(valor.toFixed(6)));

// La hora de inicio llega de la base como «18:00:00»; se entrega como «18:00» (o null si el evento no la tiene)
const horaCorta = (hora) => (hora ? String(hora).slice(0, 5) : null);

/**
 * Guarda los productos del evento (alimentos y bebidas) en evento_productos calculados
 * según el número de asistentes, con un margen de seguridad del 10% (RN-09, RN-11).
 */
const guardarProductosEvento = async (client, eventoId, asistentes, productos) => {
  for (const item of productos) {
    const resProd = await client.query(
      'SELECT * FROM catalogo_productos WHERE id = $1 AND activo = true',
      [item.producto_id]
    );

    if (resProd.rows.length === 0) {
      return {
        ok: false,
        status: 400,
        error: 'Datos inválidos',
        detalle: `El producto con ID ${item.producto_id} no existe en el catálogo o está desactivado.`
      };
    }

    const prod = resProd.rows[0];

    // QA-04: el valor unitario puede escribirse al registrar el evento
    let precioUnitario = Number(prod.precio_unitario);
    if (item.precio_unitario !== undefined && item.precio_unitario !== null) {
      const p = item.precio_unitario;
      if (typeof p !== 'number' || !Number.isFinite(p) || p < 0 || p > 100000000) {
        return {
          ok: false,
          status: 400,
          error: 'Datos inválidos',
          detalle: `El valor unitario de «${prod.nombre}» debe ser un número mayor o igual a 0.`
        };
      }
      precioUnitario = p;
    }

    let porcion = Number(prod.porcion_por_persona);
    if (prod.tipo_calculo === 'porcion_persona') {
      const enviadaAlimento = item.porcion_por_persona;
      if (enviadaAlimento !== undefined && enviadaAlimento !== null) porcion = Number(enviadaAlimento);
      if (!Number.isFinite(porcion) || porcion < 1 || porcion > LIMITES.gramosPorPersonaMax) {
        return {
          ok: false,
          status: 400,
          error: 'Datos inválidos',
          detalle: `La porción de «${prod.nombre}» debe ser un número de 1 a ${formatearCantidad(LIMITES.gramosPorPersonaMax)} gramos por persona.`
        };
      }
    }

    if (prod.tipo_calculo === 'unidad_persona') {
      const enviado = item.porcion_por_persona;
      const hayEnviado = enviado !== undefined && enviado !== null;
      porcion = !hayEnviado
        ? Number(prod.porcion_por_persona)
        : typeof enviado === 'number' || typeof enviado === 'string'
          ? Number(enviado)
          : NaN;
      if (!esUnidadesPorPersonaValida(porcion)) {
        return {
          ok: false,
          status: 400,
          error: 'Datos inválidos',
          detalle: `Las unidades por persona de «${prod.nombre}» deben ser un número entero de 1 a 10.`
        };
      }
    }

    let cantidadNeta = 0;
    let cantidadConMargen = 0;
    let unidadEntrega = prod.unidad_medida;

    if (prod.tipo_calculo === 'porcion_persona') {
      const totalGramos = asistentes * porcion;
      cantidadNeta = totalGramos >= 1000 ? totalGramos / 1000 : totalGramos;
      unidadEntrega = totalGramos >= 1000 ? 'kg' : 'g';
      cantidadConMargen = Number((cantidadNeta * 1.10).toFixed(2));
    } else if (prod.tipo_calculo === 'unidad_persona') {
      cantidadNeta = asistentes * porcion;
      cantidadConMargen = redondearArriba(cantidadNeta * 1.10);
    } else if (prod.tipo_calculo === 'botella_compartida') {
      const porcionesPorBotella = Number(prod.volumen_botella_ml) / Number(prod.tamano_porcion_ml);
      cantidadNeta = asistentes / porcionesPorBotella;
      cantidadConMargen = redondearArriba(cantidadNeta * 1.10);
      unidadEntrega = 'botellas';
    }

    const costoEstimado = cantidadConMargen * precioUnitario;

    const queryProdEvento = `
      INSERT INTO evento_productos 
        (evento_id, producto_id, porcion_por_persona, cantidad_neta, cantidad_con_margen, unidad_entrega, costo_estimado, componentes_menu)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
    `;
    await client.query(queryProdEvento, [
      eventoId,
      prod.id,
      porcion,
      cantidadNeta,
      cantidadConMargen,
      unidadEntrega,
      costoEstimado,
      item.componentes_menu || null
    ]);
  }
  return { ok: true };
};

/**
 * Guarda los servicios adicionales y mobiliario en requerimientos_adicionales,
 * validando inventario y topes de horas según la duración del evento (RN-18, HU-48).
 */
const guardarServiciosEvento = async (client, eventoId, duracionHoras, serviciosAdicionales) => {
  const elementosUsados = new Set();
  const duracionEvento = Number(duracionHoras);

  for (const servicio of serviciosAdicionales) {
    const esMobiliario = servicio.tipo === 'mobiliario';

    // Validación de mobiliario (HU-12)
    if (esMobiliario) {
      const maximoMobiliario = MAXIMO_POR_CATEGORIA['Mobiliario'];
      const cantidadPedida = servicio.cantidad;
      if (typeof cantidadPedida !== 'number' || !Number.isInteger(cantidadPedida) || cantidadPedida < 1 || cantidadPedida > maximoMobiliario) {
        return {
          ok: false,
          status: 400,
          error: 'Datos inválidos',
          detalle: `La cantidad de mobiliario debe ser un número entero de 1 a ${formatearCantidad(maximoMobiliario)}.`
        };
      }
    }

    const productoId = esMobiliario && servicio.producto_id != null ? Number(servicio.producto_id) : null;
    let descripcion = servicio.descripcion;

    if (productoId !== null) {
      const resElemento = await client.query(
        `SELECT nombre FROM catalogo_productos WHERE id = $1 AND categoria_inventario = 'Mobiliario'`,
        [Number.isInteger(productoId) ? productoId : 0]
      );
      if (resElemento.rowCount === 0 || elementosUsados.has(productoId)) {
        return {
          ok: false,
          status: 400,
          error: 'Datos inválidos',
          detalle: resElemento.rowCount === 0
            ? `El elemento de inventario ${servicio.producto_id} no existe o no es mobiliario.`
            : `El elemento «${resElemento.rows[0].nombre}» está repetido en el evento.`
        };
      }
      elementosUsados.add(productoId);
      descripcion = resElemento.rows[0].nombre;
    }

    // Reglas RN-18 y cálculo HU-48 para servicios opcionales (DJ, música, animación, etc.)
    let tipoCobro = servicio.tipo_cobro || (servicio.horas !== undefined && servicio.horas !== null ? 'por_hora' : 'por_servicio');
    let valorUnitario = 0;
    let horasServicio = null;
    let cantidadServicio = servicio.cantidad != null ? Number(servicio.cantidad) : 1;
    let costoServicio = 0;

    if (!esMobiliario) {
      if (servicio.valor_unitario !== undefined && servicio.valor_unitario !== null) {
        valorUnitario = Number(servicio.valor_unitario);
        if (!Number.isFinite(valorUnitario) || valorUnitario <= 0) {
          return {
            ok: false,
            status: 400,
            error: 'Regla de negocio no cumplida (RN-18 / HU-48)',
            detalle: `El servicio «${descripcion || servicio.tipo}» debe tener una tarifa o valor unitario mayor a 0.`
          };
        }
      } else {
        valorUnitario = 0;
      }

      // RN-18: Unidades de 1 a 5
      if (!Number.isInteger(cantidadServicio) || cantidadServicio < 1 || cantidadServicio > 5) {
        return {
          ok: false,
          status: 400,
          error: 'Regla de negocio no cumplida (RN-18)',
          detalle: `La cantidad del servicio «${descripcion || servicio.tipo}» debe ser un número entero entre 1 y 5.`
        };
      }

      // Validación de horas: SOLAMENTE si la modalidad es 'por_hora'
      if (tipoCobro === 'por_hora') {
        horasServicio = Number(servicio.horas);
        if (!Number.isFinite(horasServicio) || horasServicio <= 0) {
          return {
            ok: false,
            status: 400,
            error: 'Regla de negocio no cumplida (RN-18)',
            detalle: `Las horas del servicio «${descripcion || servicio.tipo}» deben ser un número mayor a 0.`
          };
        }
        if (horasServicio > duracionEvento) {
          return {
            ok: false,
            status: 400,
            error: 'Regla de negocio no cumplida (RN-18)',
            detalle: `Las horas del servicio «${descripcion || servicio.tipo}» no pueden superar la duración del evento (${duracionEvento} h).`
          };
        }
        costoServicio = Number((valorUnitario * horasServicio).toFixed(2));
      } else {
        // Si es por servicio (tarifa fija), horas es null y el cálculo va por cantidad
        horasServicio = null;
        costoServicio = Number((valorUnitario * cantidadServicio).toFixed(2));
      }
    }

    const queryServicio = `
      INSERT INTO requerimientos_adicionales (
        evento_id, tipo, descripcion, cantidad, horas, notas, producto_id,
        tipo_cobro, valor_unitario, costo_total
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
    `;
    await client.query(queryServicio, [
      eventoId,
      servicio.tipo || 'servicio_opcional',
      typeof descripcion === 'string' ? descripcion.trim() : descripcion,
      cantidadServicio,
      horasServicio,
      typeof servicio.notas === 'string' && servicio.notas.trim() ? servicio.notas.trim() : null,
      productoId,
      esMobiliario ? null : tipoCobro,
      esMobiliario ? 0 : valorUnitario,
      costoServicio
    ]);
  }
  return { ok: true };
};

// RN-03 (P-05): con más asistentes que este umbral se avisa que probablemente haya que alquilar
// mobiliario. No es un número fijo: sale de MAX_OWNED_CAPACITY_THRESHOLD (ver config/parametros.js).
const { UMBRAL_ALQUILER } = require('../config/parametros');
const { comprasDeEvento } = require('./comprasController');
const { comprasCoctelesDeEvento } = require('./comprasCoctelesController');
const { armarAsignacion } = require('./asignacionMeserosController');
const { armarDesviacionesPersonal } = require('./desviacionesPersonalController');

/**
 * POST /api/eventos
 * Registra un evento, sus productos de catálogo calculados con 10% de margen (RN-09, RN-11)
 * y los servicios adicionales (HU-48, RF-47, RF-48, RF-56).
 */
const crearEvento = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      nombre_evento,
      fecha_evento,
      tipo_evento,
      duracion_horas,
      asistentes,
      hora_inicio,
      observaciones_generales,
      productos = [],           // IDs de alimentos o bebidas predeterminadas
      servicios_adicionales = [] // DJ, música, sonido, requerimientos de mobiliario
    } = req.body;

    // Inicia la transacción
    await client.query('BEGIN');

    // RN-13 / COR-02: máximo 3 eventos por fecha
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`eventos-fecha-${fecha_evento}`]);
    const resConteoFecha = await client.query(
      `SELECT COUNT(*)::int AS total
       FROM eventos
       WHERE fecha_evento = $1 AND estado <> 'cancelado'`,
      [fecha_evento]
    );

    if (resConteoFecha.rows[0].total >= 3) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Regla de negocio no cumplida (RN-13 / RF-51)',
        detalle: 'Ya existen 3 eventos programados para esta fecha. El máximo permitido por día es 3.'
      });
    }

    // 1. Insertar el evento base (RF-01, RF-02)
    const queryEvento = `
      INSERT INTO eventos (nombre_evento, fecha_evento, tipo_evento, duracion_horas, asistentes, observaciones_generales, hora_inicio)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const resEvento = await client.query(queryEvento, [
      nombre_evento.trim(),
      fecha_evento,
      tipo_evento,
      duracion_horas,
      asistentes,
      (typeof observaciones_generales === 'string' && observaciones_generales.trim()) || null,
      hora_inicio || null
    ]);
    const nuevoEvento = resEvento.rows[0];

    // 2. Procesar alimentos y bebidas predeterminadas con motor de cálculo (10% margen y redondeo)
    const resProds = await guardarProductosEvento(client, nuevoEvento.id, asistentes, productos);
    if (!resProds.ok) {
      await client.query('ROLLBACK');
      return res.status(resProds.status).json({ error: resProds.error, detalle: resProds.detalle });
    }

    // 3. Registrar servicios adicionales y mobiliario (HU-05, HU-12, HU-48, RN-18, RF-56)
    const resServs = await guardarServiciosEvento(client, nuevoEvento.id, duracion_horas, servicios_adicionales);
    if (!resServs.ok) {
      await client.query('ROLLBACK');
      return res.status(resServs.status).json({ error: resServs.error, detalle: resServs.detalle });
    }

    await client.query('COMMIT');

    res.status(201).json({
      mensaje: 'Evento registrado con insumos calculados y servicios adicionales exitosamente',
      evento: { ...nuevoEvento, hora_inicio: horaCorta(nuevoEvento.hora_inicio) }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en crearEvento:', error);
    res.status(500).json({ error: 'Error al registrar el evento', detalle: error.message });
  } finally {
    client.release();
  }
};

/**
 * PUT /api/eventos/:id
 * Actualiza todos los datos de un evento (HU-50 · RF-57), recalculando alimentos,
 * bebidas, cócteles, ingredientes con 10% de margen y los costos de servicios adicionales.
 */
const actualizarEvento = async (req, res) => {
  const id = Number(req.params.id);
  const client = await pool.connect();
  try {
    const {
      nombre_evento,
      fecha_evento,
      tipo_evento,
      duracion_horas,
      asistentes,
      hora_inicio,
      observaciones_generales,
      productos = [],
      servicios_adicionales = []
    } = req.body;

    await client.query('BEGIN');

    // Verificar si el evento existe
    const resExistente = await client.query('SELECT * FROM eventos WHERE id = $1', [id]);
    if (resExistente.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    // RN-13 / RF-51: máximo 3 eventos por fecha (excluyendo el evento actual que se edita)
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`eventos-fecha-${fecha_evento}`]);
    const resConteoFecha = await client.query(
      `SELECT COUNT(*)::int AS total
       FROM eventos
       WHERE fecha_evento = $1 AND estado <> 'cancelado' AND id <> $2`,
      [fecha_evento, id]
    );

    if (resConteoFecha.rows[0].total >= 3) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Regla de negocio no cumplida (RN-13 / RF-51)',
        detalle: 'Ya existen 3 eventos programados para esta fecha. El máximo permitido por día es 3.'
      });
    }

    // 1. Actualizar el evento base (RF-57, RN-01, RN-14, RF-58)
    const estadoEnviado = req.body?.estado !== undefined ? req.body.estado : req.body?.status;
    let nuevoEstado = resExistente.rows[0].estado;
    if (estadoEnviado !== undefined && estadoEnviado !== null && (typeof estadoEnviado !== 'string' || estadoEnviado.trim() !== '')) {
      const normalizado = normalizarEstadoEvento(estadoEnviado);
      if (!normalizado) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Datos inválidos',
          detalle: 'El estado debe ser uno de: Planificación, Confirmado, Realizado o Cancelado.'
        });
      }
      const transicion = validarTransicionEstado(resExistente.rows[0].estado, normalizado);
      if (!transicion.valido) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: transicion.error,
          detalle: transicion.detalle
        });
      }
      nuevoEstado = normalizado;
    }

    const queryEvento = `
      UPDATE eventos
      SET nombre_evento = $1,
          fecha_evento = $2,
          tipo_evento = $3,
          duracion_horas = $4,
          asistentes = $5,
          observaciones_generales = $6,
          hora_inicio = $7,
          estado = $8
      WHERE id = $9
      RETURNING *;
    `;
    const resEvento = await client.query(queryEvento, [
      nombre_evento.trim(),
      fecha_evento,
      tipo_evento,
      duracion_horas,
      asistentes,
      (typeof observaciones_generales === 'string' && observaciones_generales.trim()) || null,
      hora_inicio || null,
      nuevoEstado,
      id
    ]);
    const eventoActualizado = resEvento.rows[0];

    // 2. Limpiar y reinsertar productos recalculados con la nueva cantidad de asistentes
    await client.query('DELETE FROM evento_productos WHERE evento_id = $1', [id]);
    const resProds = await guardarProductosEvento(client, id, asistentes, productos);
    if (!resProds.ok) {
      await client.query('ROLLBACK');
      return res.status(resProds.status).json({ error: resProds.error, detalle: resProds.detalle });
    }

    // 3. Limpiar y reinsertar servicios adicionales y mobiliario con la nueva duración
    await client.query('DELETE FROM requerimientos_adicionales WHERE evento_id = $1', [id]);
    const resServs = await guardarServiciosEvento(client, id, duracion_horas, servicios_adicionales);
    if (!resServs.ok) {
      await client.query('ROLLBACK');
      return res.status(resServs.status).json({ error: resServs.error, detalle: resServs.detalle });
    }

    // 4. Sincronizar reactivamente el balance logístico con las nuevas cantidades (HU-31 · RF-39, RF-40)
    try {
      const { calcularRecursosEvento, sincronizarTablaBalance } = require('./balanceController');
      const calculados = await calcularRecursosEvento(client, id);
      if (calculados) {
        await sincronizarTablaBalance(client, id, calculados);
      }
    } catch (errBalance) {
      console.warn('Advertencia al sincronizar balance en edición de evento:', errBalance.message);
    }

    await client.query('COMMIT');

    res.status(200).json({
      mensaje: 'Evento actualizado exitosamente',
      evento: { ...eventoActualizado, hora_inicio: horaCorta(eventoActualizado.hora_inicio) }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en actualizarEvento:', error);
    res.status(500).json({ error: 'Error al actualizar el evento', detalle: error.message });
  } finally {
    client.release();
  }
};

/**
 * GET /api/eventos
 * Consulta la lista general de eventos registrados (RF-07), ordenada por fecha.
 */
const listarEventos = async (req, res) => {
  try {
    const consulta = `
      SELECT 
        id,
        nombre_evento,
        fecha_evento,
        tipo_evento,
        duracion_horas,
        asistentes,
        estado,
        observaciones_generales,
        to_char(hora_inicio, 'HH24:MI') AS hora_inicio,
        creado_en,
        CASE 
          WHEN asistentes > 300 THEN true 
          ELSE false 
        END AS es_modalidad_buffet,
        asistentes > $1 AS aviso_alquiler
      FROM eventos
      ORDER BY fecha_evento ASC;
    `;
    const resultado = await pool.query(consulta, [UMBRAL_ALQUILER]);
    res.json(resultado.rows);
  } catch (error) {
    console.error('Error al listar eventos:', error);
    res.status(500).json({ error: 'Error al consultar la lista de eventos', detalle: error.message });
  }
};

/**
 * GET /api/eventos/:id
 * Consulta el detalle completo de un evento por ID (RF-07, RF-47, RF-48, RF-56)
 */
const obtenerDetalleEvento = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1 || id > 2147483647) {
      return res.status(400).json({ error: 'Datos inválidos', detalle: 'El identificador del evento no es válido.' });
    }

    // 1. Datos básicos del evento
    const queryEvento = `SELECT * FROM eventos WHERE id = $1;`;
    const resEvento = await pool.query(queryEvento, [id]);

    if (resEvento.rows.length === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    // 2. Alimentos y bebidas seleccionadas con sus cálculos
    const queryProductos = `
      SELECT 
        ep.id,
        ep.producto_id,
        cp.nombre,
        cp.clasificacion,
        ep.porcion_por_persona,
        ep.componentes_menu,
        ep.cantidad_neta,
        ep.cantidad_con_margen,
        ep.unidad_entrega,
        CASE WHEN ep.cantidad_con_margen > 0
          THEN ROUND(ep.costo_estimado / ep.cantidad_con_margen, 2)
          ELSE cp.precio_unitario END AS precio_unitario,
        ep.costo_estimado
      FROM evento_productos ep
      JOIN catalogo_productos cp ON ep.producto_id = cp.id
      WHERE ep.evento_id = $1
      ORDER BY cp.clasificacion, cp.nombre;
    `;
    const resProductos = await pool.query(queryProductos, [id]);

    // 3. Servicios adicionales y mobiliario con columnas de HU-48
    const queryServicios = `
      SELECT
        r.id,
        r.tipo,
        r.descripcion,
        r.cantidad,
        r.horas,
        r.tipo_cobro,
        r.valor_unitario,
        r.costo_total,
        r.notas,
        r.creado_en,
        r.producto_id,
        c.cantidad_propia AS disponible_inventario,
        c.es_propio AS inventario_es_propio,
        CASE
          WHEN r.tipo = 'mobiliario' THEN
            LEAST(COALESCE(r.cantidad, 0), CASE WHEN c.es_propio IS FALSE THEN 0 ELSE COALESCE(c.cantidad_propia, 0) END)
        END AS unidades_propias,
        CASE
          WHEN r.tipo = 'mobiliario' THEN
            COALESCE(r.cantidad, 0) - LEAST(COALESCE(r.cantidad, 0), CASE WHEN c.es_propio IS FALSE THEN 0 ELSE COALESCE(c.cantidad_propia, 0) END)
        END AS unidades_alquilar
      FROM requerimientos_adicionales r
      LEFT JOIN catalogo_productos c ON c.id = r.producto_id
      WHERE r.evento_id = $1
      ORDER BY r.id ASC;
    `;
    const resServicios = await pool.query(queryServicios, [id]);

    const asistentes = resEvento.rows[0].asistentes;
    const umbralSuperado = asistentes > UMBRAL_ALQUILER;
    const unidadesAlquilar = resServicios.rows.reduce((suma, s) => suma + Number(s.unidades_alquilar || 0), 0);

    // Consolidación de presupuesto (HU-48, RF-56)
    const costoAlimentosBebidas = Number(
      resProductos.rows.reduce((sum, p) => sum + Number(p.costo_estimado || 0), 0).toFixed(2)
    );
    let costoServicios = 0;
    for (const s of resServicios.rows) {
      if (s.tipo !== 'mobiliario') {
        let costo = s.costo_total != null ? Number(s.costo_total) : null;
        if (costo == null && s.valor_unitario != null) {
          costo = s.tipo_cobro === 'por_hora'
            ? Number(s.valor_unitario) * Number(s.horas || 0)
            : Number(s.valor_unitario) * Number(s.cantidad || 1);
          s.costo_total = Number(costo.toFixed(2));
        }
        costoServicios += Number(s.costo_total || 0);
      }
    }
    costoServicios = Number(costoServicios.toFixed(2));
    const costoTotalEstimado = Number((costoAlimentosBebidas + costoServicios).toFixed(2));

    res.json({
      ...resEvento.rows[0],
      hora_inicio: horaCorta(resEvento.rows[0].hora_inicio),
      es_modalidad_buffet: asistentes > 300,
      aviso_alquiler: umbralSuperado,
      estado_alquiler: {
        requiere_alquiler: umbralSuperado,
        umbral_superado: umbralSuperado,
        umbral: UMBRAL_ALQUILER,
        inventario_insuficiente: unidadesAlquilar > 0,
        unidades_alquilar: unidadesAlquilar,
        motivo: umbralSuperado
          ? `La cantidad de asistentes (${asistentes}) supera la capacidad propia (${UMBRAL_ALQUILER}).`
          : `La cantidad de asistentes (${asistentes}) está dentro de la capacidad propia (${UMBRAL_ALQUILER}).`
      },
      resumen_presupuesto: {
        costo_alimentos_bebidas: costoAlimentosBebidas,
        costo_servicios: costoServicios,
        costo_total_estimado: costoTotalEstimado
      },
      productos_calculados: resProductos.rows,
      servicios_adicionales: resServicios.rows,
      logistica: {
        meseros_requeridos: calcularMeseros(asistentes),
        asistentes_por_mesero: ASISTENTES_POR_MESERO,
        relacion_meseros: `1 por cada ${ASISTENTES_POR_MESERO} asistentes`,
        cocineros_requeridos: calcularCocineros(asistentes),
        asistentes_por_grupo_cocina: ASISTENTES_POR_GRUPO_COCINA,
        cocineros_por_grupo: COCINEROS_POR_GRUPO,
        relacion_cocineros: `${COCINEROS_POR_GRUPO} por cada ${ASISTENTES_POR_GRUPO_COCINA} asistentes`
      },
      // Ingredientes a comprar (HU-47 · RF-55, RN-09, RN-20): salen de las recetas de los platos y los asistentes
      compras_ingredientes: await comprasDeEvento(pool, id, asistentes),
      // Botellas de licor para coctelería a comprar (HU-45 · RF-53, RN-09, RN-19): salen de las recetas de cócteles
      compras_cocteles: await comprasCoctelesDeEvento(pool, id, asistentes),
      // Meseros asignados al evento y cuántos faltan o sobran frente a los requeridos (HU-28 · RF-35)
      asignacion_meseros: await armarAsignacion(pool, id, asistentes),
      // Desviaciones y alertas de personal (HU-25 · RF-32)
      desviaciones_personal: await armarDesviacionesPersonal(pool, id, asistentes)
    });
  } catch (error) {
    console.error('Error al obtener detalle del evento:', error);
    res.status(500).json({ error: 'Error al consultar el detalle del evento', detalle: error.message });
  }
};

/**
 * PATCH /api/eventos/:id/estado
 * Cambia el estado de un evento (HU-51 · RF-58).
 * Estados: Planificación, Confirmado, Realizado y Cancelado.
 * Reglas de transición:
 * - Un evento Cancelado puede volver a Planificación.
 * - Un evento Realizado ya no puede cambiar a ningún otro estado.
 */
const cambiarEstadoEvento = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1 || id > 2147483647) {
    return res.status(400).json({ error: 'Datos inválidos', detalle: 'El identificador del evento no es válido.' });
  }

  const bruto = req.body?.estado !== undefined ? req.body.estado : req.body?.status;
  if (bruto === undefined || bruto === null || (typeof bruto === 'string' && bruto.trim() === '')) {
    return res.status(400).json({
      error: 'Datos inválidos',
      detalle: 'El estado es obligatorio: Planificación, Confirmado, Realizado o Cancelado.'
    });
  }

  const nuevoEstado = normalizarEstadoEvento(bruto);
  if (!nuevoEstado) {
    return res.status(400).json({
      error: 'Datos inválidos',
      detalle: 'El estado debe ser uno de: Planificación, Confirmado, Realizado o Cancelado.'
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Bloqueo de fila para evitar condiciones de carrera
    const resEvento = await client.query('SELECT * FROM eventos WHERE id = $1 FOR UPDATE', [id]);
    if (resEvento.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    const eventoActual = resEvento.rows[0];
    const transicion = validarTransicionEstado(eventoActual.estado, nuevoEstado);
    if (!transicion.valido) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: transicion.error,
        detalle: transicion.detalle
      });
    }

    // Si estaba cancelado y pasa a un estado activo, verificar tope de 3 eventos por fecha (RN-13 / RF-51)
    if (eventoActual.estado === 'cancelado' && nuevoEstado !== 'cancelado') {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`eventos-fecha-${eventoActual.fecha_evento}`]);
      const resConteoFecha = await client.query(
        `SELECT COUNT(*)::int AS total
         FROM eventos
         WHERE fecha_evento = $1 AND estado <> 'cancelado' AND id <> $2`,
        [eventoActual.fecha_evento, id]
      );
      if (resConteoFecha.rows[0].total >= 3) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Regla de negocio no cumplida (RN-13 / RF-51)',
          detalle: 'No se puede reactivar el evento porque ya existen 3 eventos programados para esa fecha.'
        });
      }
    }

    const resUpdate = await client.query(
      `UPDATE eventos
       SET estado = $1
       WHERE id = $2
       RETURNING id, nombre_evento, fecha_evento, tipo_evento, duracion_horas, asistentes, estado, observaciones_generales, to_char(hora_inicio, 'HH24:MI') AS hora_inicio`,
      [nuevoEstado, id]
    );

    await client.query('COMMIT');

    const eventoActualizado = resUpdate.rows[0];
    res.status(200).json({
      mensaje: 'Estado del evento actualizado exitosamente',
      evento: {
        ...eventoActualizado,
        hora_inicio: horaCorta(eventoActualizado.hora_inicio)
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al cambiar el estado del evento (HU-51):', error);
    res.status(500).json({ error: 'Error al cambiar el estado del evento', detalle: error.message });
  } finally {
    client.release();
  }
};

module.exports = {
  crearEvento,
  actualizarEvento,
  listarEventos,
  obtenerDetalleEvento,
  cambiarEstadoEvento
};