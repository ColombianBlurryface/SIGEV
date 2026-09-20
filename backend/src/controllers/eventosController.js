// backend/src/controllers/eventosController.js
const pool = require('../config/db');

/**
 * Registra un evento, sus productos de catálogo calculados con 10% de margen (RN-09, RN-11)
 * y los servicios adicionales opcionales sin cálculo (RF-06, RF-47, RF-48).
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
        // Ej: Carne (gramos) -> asistentes * porción. Margen 10%.
        const totalGramos = asistentes * porcion;
        cantidadNeta = totalGramos >= 1000 ? totalGramos / 1000 : totalGramos;
        unidadEntrega = totalGramos >= 1000 ? 'kg' : 'g';
        cantidadConMargen = Number((cantidadNeta * 1.10).toFixed(2));
      } else if (prod.tipo_calculo === 'unidad_persona') {
        // Ej: Cervezas individuales -> asistentes * unidades_persona. Margen 10% y redondeo hacia arriba.
        cantidadNeta = asistentes * porcion;
        cantidadConMargen = Math.ceil(cantidadNeta * 1.10);
      } else if (prod.tipo_calculo === 'botella_compartida') {
        // Ej: Vino/Whisky -> Porciones por botella = volumen / tamaño copa. Margen 10% y ceil.
        const porcionesPorBotella = Number(prod.volumen_botella_ml) / Number(prod.tamano_porcion_ml);
        cantidadNeta = asistentes / porcionesPorBotella;
        cantidadConMargen = Math.ceil(cantidadNeta * 1.10);
        unidadEntrega = 'botellas';
      }

      const costoEstimado = cantidadConMargen * Number(prod.precio_unitario);

      const queryProdEvento = `
        INSERT INTO evento_productos 
          (evento_id, producto_id, porcion_por_persona, cantidad_neta, cantidad_con_margen, unidad_entrega, costo_estimado)
        VALUES ($1, $2, $3, $4, $5, $6, $7);
      `;
      await client.query(queryProdEvento, [
        nuevoEvento.id,
        prod.id,
        porcion,
        cantidadNeta,
        cantidadConMargen,
        unidadEntrega,
        costoEstimado
      ]);
    }

    // 3. Registrar servicios adicionales (DJ, música, mobiliario) sin cálculo (RF-06, RF-47, RF-48)
    for (const servicio of servicios_adicionales) {
      const queryServicio = `
        INSERT INTO requerimientos_adicionales (evento_id, tipo, descripcion, cantidad, notas)
        VALUES ($1, $2, $3, $4, $5);
      `;
      await client.query(queryServicio, [
        nuevoEvento.id,
        servicio.tipo || 'servicio_opcional',
        servicio.descripcion,
        servicio.cantidad || null,
        servicio.notas || null
      ]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      mensaje: 'Evento registrado con insumos calculados y servicios adicionales exitosamente',
      evento: nuevoEvento
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
 * Consulta la lista general de eventos registrados (RF-07)
 * Incluye la bandera de si aplica modalidad buffet por asistentes > 300 (RN-02)
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
        END AS es_modalidad_buffet
      FROM eventos
      ORDER BY fecha_evento ASC;
    `;
    const resultado = await pool.query(consulta);
    res.json(resultado.rows);
  } catch (error) {
    console.error('Error al listar eventos:', error);
    res.status(500).json({ error: 'Error al consultar la lista de eventos', detalle: error.message });
  }
};

/**
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

    // 3. Servicios adicionales opcionales (DJ, música, sonido) (RF-06, RF-47, RF-48)
    const queryServicios = `
      SELECT id, tipo, descripcion, cantidad, notas, creado_en
      FROM requerimientos_adicionales
      WHERE evento_id = $1
      ORDER BY id ASC;
    `;
    const resServicios = await pool.query(queryServicios, [id]);

    res.json({
      ...resEvento.rows[0],
      es_modalidad_buffet: resEvento.rows[0].asistentes > 300,
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