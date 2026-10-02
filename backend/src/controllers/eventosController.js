/**
 * Controlador de eventos.
 *
 * Aquí está el "motor de cálculo" de SIGEV: al registrar un evento, calcula cuánto
 * se necesita de cada alimento y bebida según el número de asistentes, con un
 * margen de seguridad del 10%. También guarda los servicios adicionales y el
 * mobiliario, que se registran sin cálculo. Al consultar un evento, compara su
 * mobiliario con el inventario para saber qué es propio y qué hay que alquilar (HU-12).
 */
const pool = require('../config/db');

// Redondea hacia arriba evitando errores de precisión decimal de JavaScript.
// Se redondea a 6 decimales antes del ceil: 50 * 1.10 da 55.00000000000001 en JS y subiría a 56.
const redondearArriba = (valor) => Math.ceil(Number(valor.toFixed(6)));

// RN-03 (P-05): con más de 200 asistentes se avisa que probablemente haya que alquilar mobiliario.
const UMBRAL_ALQUILER = 200;

/**
 * POST /api/eventos
 * Registra un evento, sus productos de catálogo calculados con 10% de margen (RN-09, RN-11)
 * y los servicios adicionales opcionales sin cálculo (RF-06, RF-47, RF-48).
 *
 * Todo se guarda dentro de una transacción: si algo falla a mitad de camino
 * (por ejemplo, un producto que no existe), no queda nada guardado a medias.
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
      observaciones_generales,
      productos = [],           // IDs de alimentos o bebidas predeterminadas
      servicios_adicionales = [] // DJ, música, sonido, requerimientos de mobiliario
    } = req.body;

    // Inicia la transacción: a partir de aquí todo se confirma junto (COMMIT) o se deshace (ROLLBACK)
    await client.query('BEGIN');

    // 1. Insertar el evento base (RF-01, RF-02)
    const queryEvento = `
      INSERT INTO eventos (nombre_evento, fecha_evento, tipo_evento, duracion_horas, asistentes, observaciones_generales)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const resEvento = await client.query(queryEvento, [
      nombre_evento,
      fecha_evento,
      tipo_evento,
      duracion_horas,
      asistentes,
      observaciones_generales || null
    ]);
    const nuevoEvento = resEvento.rows[0];

    // 2. Procesar alimentos y bebidas predeterminadas con motor de cálculo (10% margen y redondeo)
    for (const item of productos) {
      // Consultar especificaciones del catálogo (RN-10)
      const resProd = await client.query(
        'SELECT * FROM catalogo_productos WHERE id = $1 AND activo = true',
        [item.producto_id]
      );

      if (resProd.rows.length === 0) {
        throw new Error(`El producto con ID ${item.producto_id} no existe en el catálogo.`);
      }

      const prod = resProd.rows[0];
      const porcion = Number(item.porcion_por_persona || prod.porcion_por_persona);
      let cantidadNeta = 0;
      let cantidadConMargen = 0;
      let unidadEntrega = prod.unidad_medida;

      // Aplicación de fórmulas según clasificación y tipo de cálculo (RN-10, RN-09, RN-11)
      if (prod.tipo_calculo === 'porcion_persona') {
        // Ej: carne en gramos -> asistentes * porción. Si pasa de 1000 g se entrega en kg. Margen 10%.
        const totalGramos = asistentes * porcion;
        cantidadNeta = totalGramos >= 1000 ? totalGramos / 1000 : totalGramos;
        unidadEntrega = totalGramos >= 1000 ? 'kg' : 'g';
        cantidadConMargen = Number((cantidadNeta * 1.10).toFixed(2));
      } else if (prod.tipo_calculo === 'unidad_persona') {
        // Ej: Cervezas individuales -> asistentes * unidades_persona. Margen 10% y redondeo hacia arriba.
        cantidadNeta = asistentes * porcion;
        cantidadConMargen = redondearArriba(cantidadNeta * 1.10);
      } else if (prod.tipo_calculo === 'botella_compartida') {
        // Ej: Vino/Whisky -> Porciones por botella = volumen / tamaño copa. Margen 10% y ceil.
        const porcionesPorBotella = Number(prod.volumen_botella_ml) / Number(prod.tamano_porcion_ml);
        cantidadNeta = asistentes / porcionesPorBotella;
        cantidadConMargen = redondearArriba(cantidadNeta * 1.10);
        unidadEntrega = 'botellas';
      }

      // El costo se calcula sobre la cantidad con margen (lo que realmente se compra)
      const costoEstimado = cantidadConMargen * Number(prod.precio_unitario);

      const queryProdEvento = `
        INSERT INTO evento_productos 
          (evento_id, producto_id, porcion_por_persona, cantidad_neta, cantidad_con_margen, unidad_entrega, costo_estimado, componentes_menu)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
      `;
      await client.query(queryProdEvento, [
        nuevoEvento.id,
        prod.id,
        porcion,
        cantidadNeta,
        cantidadConMargen,
        unidadEntrega,
        costoEstimado,
        item.componentes_menu || null
      ]);
    }

    // 3. Registrar servicios adicionales (DJ, música, mobiliario) sin cálculo (RF-06, RF-47, RF-48).
    //    El mobiliario llega con tipo 'mobiliario'; el resto con su tipo de servicio (dj, sonido...).
    //    HU-12: el mobiliario puede traer el producto_id de un elemento del inventario.
    const elementosUsados = new Set();
    for (const servicio of servicios_adicionales) {
      const esMobiliario = servicio.tipo === 'mobiliario';
      const productoId = esMobiliario && servicio.producto_id != null ? Number(servicio.producto_id) : null;
      let descripcion = servicio.descripcion;

      if (productoId !== null) {
        // Solo se aceptan elementos de la categoría Mobiliario y sin repetir dentro del mismo evento
        const resElemento = await client.query(
          `SELECT nombre FROM catalogo_productos WHERE id = $1 AND categoria_inventario = 'Mobiliario'`,
          [Number.isInteger(productoId) ? productoId : 0]
        );
        if (resElemento.rowCount === 0 || elementosUsados.has(productoId)) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            error: 'Datos inválidos',
            detalle: resElemento.rowCount === 0
              ? `El elemento de inventario ${servicio.producto_id} no existe o no es mobiliario.`
              : `El elemento «${resElemento.rows[0].nombre}» está repetido en el evento.`
          });
        }
        elementosUsados.add(productoId);
        descripcion = resElemento.rows[0].nombre; // Se guarda el nombre actual del inventario
      }

      const queryServicio = `
        INSERT INTO requerimientos_adicionales (evento_id, tipo, descripcion, cantidad, notas, producto_id)
        VALUES ($1, $2, $3, $4, $5, $6);
      `;
      await client.query(queryServicio, [
        nuevoEvento.id,
        servicio.tipo || 'servicio_opcional',
        descripcion,
        servicio.cantidad || null,
        servicio.notas || null,
        productoId
      ]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      mensaje: 'Evento registrado con insumos calculados y servicios adicionales exitosamente',
      evento: nuevoEvento
    });
  } catch (error) {
    // Deshace todo lo que se alcanzó a guardar en esta transacción
    await client.query('ROLLBACK');
    console.error('Error en crearEvento:', error);
    res.status(500).json({ error: 'Error al registrar el evento', detalle: error.message });
  } finally {
    client.release();
  }
};

/**
 * GET /api/eventos
 * Consulta la lista general de eventos registrados (RF-07), ordenada por fecha.
 * Incluye la bandera es_modalidad_buffet cuando hay más de 300 asistentes (RN-02)
 * y aviso_alquiler cuando hay más de 200 (RN-03).
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
 * Consulta el detalle completo de un evento por ID (RF-07)
 * Retorna la información general, los productos calculados y los servicios adicionales.
 */
const obtenerDetalleEvento = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Datos básicos del evento
    const queryEvento = `SELECT * FROM eventos WHERE id = $1;`;
    const resEvento = await pool.query(queryEvento, [id]);

    if (resEvento.rows.length === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    // 2. Alimentos y bebidas seleccionadas con sus cálculos (RF-21 a RF-27)
    const queryProductos = `
      SELECT 
        ep.id,
        cp.nombre,
        cp.clasificacion,
        ep.porcion_por_persona,
        ep.componentes_menu,
        ep.cantidad_neta,
        ep.cantidad_con_margen,
        ep.unidad_entrega,
        cp.precio_unitario,
        ep.costo_estimado
      FROM evento_productos ep
      JOIN catalogo_productos cp ON ep.producto_id = cp.id
      WHERE ep.evento_id = $1
      ORDER BY cp.clasificacion, cp.nombre;
    `;
    const resProductos = await pool.query(queryProductos, [id]);

    // 3. Servicios adicionales y mobiliario (RF-06, RF-47, RF-48).
    //    HU-12 (RF-14): para el mobiliario se compara la cantidad pedida con el stock actual
    //    del inventario. Lo que alcanza son unidades propias y el resto hay que alquilarlo.
    //    Si el mobiliario no está relacionado con el inventario, todo va a alquiler.
    const queryServicios = `
      SELECT
        r.id, r.tipo, r.descripcion, r.cantidad, r.notas, r.creado_en, r.producto_id,
        c.cantidad_propia AS disponible_inventario,
        CASE WHEN r.tipo = 'mobiliario'
          THEN LEAST(COALESCE(r.cantidad, 0), COALESCE(c.cantidad_propia, 0)) END AS unidades_propias,
        CASE WHEN r.tipo = 'mobiliario'
          THEN COALESCE(r.cantidad, 0) - LEAST(COALESCE(r.cantidad, 0), COALESCE(c.cantidad_propia, 0)) END AS unidades_alquilar
      FROM requerimientos_adicionales r
      LEFT JOIN catalogo_productos c ON c.id = r.producto_id
      WHERE r.evento_id = $1
      ORDER BY r.id ASC;
    `;
    const resServicios = await pool.query(queryServicios, [id]);

    res.json({
      ...resEvento.rows[0],
      es_modalidad_buffet: resEvento.rows[0].asistentes > 300,
      aviso_alquiler: resEvento.rows[0].asistentes > UMBRAL_ALQUILER,
      productos_calculados: resProductos.rows,
      servicios_adicionales: resServicios.rows
    });
  } catch (error) {
    console.error('Error al obtener detalle del evento:', error);
    res.status(500).json({ error: 'Error al consultar el detalle del evento', detalle: error.message });
  }
};

module.exports = {
  crearEvento,
  listarEventos,
  obtenerDetalleEvento
};