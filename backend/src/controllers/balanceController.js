/**
 * Controlador de Balance Logístico (Épica 6 · HU-31 a HU-35, RF-39 a RF-44).
 *
 * HU-31 (RF-39, RF-40): Genera automáticamente el balance de recursos necesarios
 * para un evento integrando personal, alimentos, bebidas, mobiliario y servicios,
 * indicando la cantidad requerida para cada elemento.
 */
const pool = require('../config/db');
const { calcularMeseros, calcularCocineros } = require('../config/reglasPersonal');
const { comprasDeEvento } = require('./comprasController');
const { comprasCoctelesDeEvento } = require('./comprasCoctelesController');

/**
 * Genera y consolida todos los recursos necesarios para un evento a partir de sus datos.
 *
 * @param {import('pg').Pool | import('pg').PoolClient} cliente
 * @param {number} eventoId
 * @returns {Promise<Array<object>>} Lista de recursos requeridos
 */
const calcularRecursosEvento = async (cliente, eventoId) => {
  // 1. Consultar evento básico
  const resEvento = await cliente.query(
    'SELECT id, nombre_evento, asistentes, duracion_horas, estado FROM eventos WHERE id = $1',
    [eventoId]
  );
  if (resEvento.rows.length === 0) return null;
  const evento = resEvento.rows[0];
  const asistentes = Number(evento.asistentes);
  const duracionHoras = Number(evento.duracion_horas);

  const recursos = [];

  // ===========================================================================
  // 1. PERSONAL (HU-21, HU-22, HU-25, HU-28, HU-29)
  // ===========================================================================
  const reqMeseros = calcularMeseros(asistentes);
  const reqCocineros = calcularCocineros(asistentes);

  // Consultar personal asignado discriminando por estado de asignación (HU-29)
  const resPersonal = await cliente.query(
    `SELECT p.rol, COALESCE(ep.estado, 'confirmado') AS estado_asignacion, COUNT(*)::int AS asignados
     FROM evento_personal ep
     JOIN personal p ON p.id = ep.personal_id
     WHERE ep.evento_id = $1 AND p.activo = true AND COALESCE(ep.estado, 'por_confirmar') <> 'no_puede'
     GROUP BY p.rol, COALESCE(ep.estado, 'confirmado')`,
    [eventoId]
  );

  const personalPorRol = {
    mesero: { confirmados: 0, por_confirmar: 0, total: 0 },
    cocinero: { confirmados: 0, por_confirmar: 0, total: 0 }
  };

  for (const r of resPersonal.rows) {
    const rol = r.rol === 'cocinero' ? 'cocinero' : 'mesero';
    const cant = Number(r.asignados || r.cantidad || 0);
    const est = String(r.estado_asignacion || r.estado || 'confirmado').trim().toLowerCase();

    if (est === 'confirmado' || est === 'confirmed') {
      personalPorRol[rol].confirmados += cant;
    } else if (est === 'por_confirmar' || est === 'pending') {
      personalPorRol[rol].por_confirmar += cant;
    } else {
      personalPorRol[rol].confirmados += cant;
    }
    personalPorRol[rol].total += cant;
  }

  const meserosDisp = Math.min(reqMeseros, personalPorRol.mesero.confirmados);
  const cocinerosDisp = Math.min(reqCocineros, personalPorRol.cocinero.confirmados);

  let notasMeseros = `1 por cada 20 asistentes. Confirmados: ${personalPorRol.mesero.confirmados}`;
  if (personalPorRol.mesero.por_confirmar > 0) {
    notasMeseros += ` · Por confirmar: ${personalPorRol.mesero.por_confirmar}`;
  }

  let notasCocineros = `2 por cada 25 asistentes. Confirmados: ${personalPorRol.cocinero.confirmados}`;
  if (personalPorRol.cocinero.por_confirmar > 0) {
    notasCocineros += ` · Por confirmar: ${personalPorRol.cocinero.por_confirmar}`;
  }

  recursos.push({
    categoria: 'personal',
    recurso_nombre: 'Meseros',
    origen_tipo: 'personal',
    origen_id: null,
    cantidad_requerida: reqMeseros,
    cantidad_disponible: meserosDisp,
    unidad_medida: 'personas',
    estado: personalPorRol.mesero.confirmados >= reqMeseros ? 'disponible' : 'por_conseguir',
    notas: notasMeseros
  });

  recursos.push({
    categoria: 'personal',
    recurso_nombre: 'Cocineros',
    origen_tipo: 'personal',
    origen_id: null,
    cantidad_requerida: reqCocineros,
    cantidad_disponible: cocinerosDisp,
    unidad_medida: 'personas',
    estado: personalPorRol.cocinero.confirmados >= reqCocineros ? 'disponible' : 'por_conseguir',
    notas: notasCocineros
  });

  // ===========================================================================
  // 2. ALIMENTOS (HU-46, HU-47 · Ingredientes con margen del 10%)
  // ===========================================================================
  const comprasAlimentos = await comprasDeEvento(cliente, eventoId, asistentes);
  if (comprasAlimentos && Array.isArray(comprasAlimentos.items)) {
    for (const ing of comprasAlimentos.items) {
      recursos.push({
        categoria: 'alimento',
        recurso_nombre: ing.ingrediente,
        origen_tipo: 'ingrediente',
        origen_id: ing.ingrediente_id || null,
        cantidad_requerida: Number(ing.cantidad_a_comprar),
        cantidad_disponible: 0,
        unidad_medida: ing.unidad_compra || 'unidades',
        estado: 'por_comprar',
        notas: ing.platos && ing.platos.length > 0 ? `Para: ${ing.platos.join(', ')}` : null
      });
    }
  }

  // ===========================================================================
  // 3. BEBIDAS (Bebidas de catálogo + licores para coctelería)
  // ===========================================================================
  // 3.1. Bebidas generales del catálogo
  const resBebidas = await cliente.query(
    `SELECT ep.producto_id, cp.nombre, ep.cantidad_con_margen,
            COALESCE(ep.unidad_entrega, cp.unidad_medida, 'unidades') AS unidad_entrega,
            COALESCE(inv.es_propio, cp.es_propio, true) AS es_propio,
            COALESCE(inv.cantidad_propia, cp.cantidad_propia, 0) AS stock_propio
     FROM evento_productos ep
     JOIN catalogo_productos cp ON cp.id = ep.producto_id
     LEFT JOIN catalogo_productos inv ON LOWER(TRIM(inv.nombre)) = LOWER(TRIM(cp.nombre))
                                     AND inv.categoria_inventario IS NOT NULL
                                     AND inv.activo = true
     WHERE ep.evento_id = $1 AND cp.clasificacion = 'bebida_general'
     ORDER BY cp.nombre`,
    [eventoId]
  );
  for (const b of resBebidas.rows) {
    const cantReq = Number(b.cantidad_con_margen);
    const stockPropio = Number(b.stock_propio || 0);
    const cantDisp = b.es_propio ? Math.min(cantReq, stockPropio) : 0;
    const estado = cantDisp >= cantReq ? 'disponible' : 'por_comprar';
    recursos.push({
      categoria: 'bebida',
      recurso_nombre: b.nombre,
      origen_tipo: 'producto_catalogo',
      origen_id: b.producto_id,
      cantidad_requerida: cantReq,
      cantidad_disponible: cantDisp,
      unidad_medida: b.unidad_entrega || 'unidades',
      estado,
      notas: stockPropio > 0
        ? (cantDisp >= cantReq
            ? `Cubierto con inventario (Stock en bodega: ${stockPropio} ${b.unidad_entrega || 'unidades'})`
            : `Stock en bodega: ${stockPropio} ${b.unidad_entrega || 'unidades'} · Faltan ${cantReq - cantDisp} por comprar`)
        : 'Sin existencias en inventario propio'
    });
  }

  // 3.2. Licores calculados para coctelería (HU-45 cruzado con inventario en bodega)
  const comprasLicores = await comprasCoctelesDeEvento(cliente, eventoId, asistentes);
  if (comprasLicores && Array.isArray(comprasLicores.items)) {
    for (const licor of comprasLicores.items) {
      // Consultar stock en inventario por id o por nombre en categoría de coctelería
      const resStock = await cliente.query(
        `SELECT id, cantidad_propia, es_propio
         FROM catalogo_productos
         WHERE (id = $1 OR LOWER(TRIM(nombre)) = LOWER(TRIM($2)))
           AND categoria_inventario IS NOT NULL
           AND activo = true
         ORDER BY (id = $1) DESC, cantidad_propia DESC
         LIMIT 1`,
        [licor.licor_id, licor.nombre_licor]
      );
      const stockPropio = resStock.rows.length > 0 ? Number(resStock.rows[0].cantidad_propia || 0) : 0;
      const cantReq = Number(licor.botellas_requeridas);
      const cantDisp = Math.min(cantReq, stockPropio);
      const estado = cantDisp >= cantReq ? 'disponible' : 'por_comprar';
      const coctelesTexto = licor.cocteles && licor.cocteles.length > 0 ? `Para cócteles: ${licor.cocteles.join(', ')}` : null;

      recursos.push({
        categoria: 'bebida',
        recurso_nombre: licor.nombre_licor,
        origen_tipo: 'coctel',
        origen_id: licor.licor_id || null,
        cantidad_requerida: cantReq,
        cantidad_disponible: cantDisp,
        unidad_medida: 'botellas',
        estado,
        notas: stockPropio > 0
          ? (cantDisp >= cantReq
              ? `${coctelesTexto ? `${coctelesTexto} · ` : ''}Cubierto con inventario (Stock en bodega: ${stockPropio} botellas)`
              : `${coctelesTexto ? `${coctelesTexto} · ` : ''}Stock en bodega: ${stockPropio} botellas · Faltan ${cantReq - cantDisp} por comprar`)
          : (coctelesTexto || 'Sin existencias en inventario propio')
      });
    }
  }

  // ===========================================================================
  // 4. MOBILIARIO Y 5. SERVICIOS ADICIONALES (HU-12, HU-48)
  // ===========================================================================
  const resRequerimientos = await cliente.query(
    `SELECT r.id, r.tipo, r.descripcion, r.cantidad, r.horas, r.tipo_cobro, r.notas,
            r.producto_id,
            COALESCE(cp.es_propio, true) AS es_propio,
            COALESCE(cp.cantidad_propia, 0) AS stock_propio,
            CASE
              WHEN r.tipo = 'mobiliario' THEN
                LEAST(COALESCE(r.cantidad, 0), CASE WHEN cp.es_propio IS FALSE THEN 0 ELSE COALESCE(cp.cantidad_propia, 0) END)
              ELSE 0
            END AS unidades_propias,
            CASE
              WHEN r.tipo = 'mobiliario' THEN
                COALESCE(r.cantidad, 0) - LEAST(COALESCE(r.cantidad, 0), CASE WHEN cp.es_propio IS FALSE THEN 0 ELSE COALESCE(cp.cantidad_propia, 0) END)
              ELSE 0
            END AS unidades_alquilar
     FROM requerimientos_adicionales r
     LEFT JOIN catalogo_productos cp ON cp.id = r.producto_id
     WHERE r.evento_id = $1
     ORDER BY r.tipo, r.id`,
    [eventoId]
  );

  for (const req of resRequerimientos.rows) {
    if (req.tipo === 'mobiliario') {
      const cantReq = Number(req.cantidad);
      const cantDisp = Number(req.unidades_propias || 0);
      const alquilar = Number(req.unidades_alquilar || 0);

      // HU-32 · Escenario 3: Si hay déficit y 0 unidades disponibles/gestionadas, el estado por defecto es pendiente.
      // Si hay existencias parciales o gestión en curso, es por conseguir (TO_PROCURE).
      let estadoMob = 'disponible';
      if (alquilar > 0) {
        estadoMob = cantDisp > 0 ? 'por_conseguir' : 'pendiente';
      }

      recursos.push({
        categoria: 'mobiliario',
        recurso_nombre: req.descripcion,
        origen_tipo: req.producto_id ? 'producto_catalogo' : 'servicio_adicional',
        origen_id: req.producto_id || req.id,
        cantidad_requerida: cantReq,
        cantidad_disponible: cantDisp,
        unidad_medida: 'unidades',
        estado: estadoMob,
        notas: alquilar > 0
          ? `${cantDisp} unidades propias disponibles · ${alquilar} unidades por alquilar`
          : 'Totalmente cubierto con unidades propias'
      });
    } else {
      // Servicio adicional (DJ, música en vivo, animación, etc.)
      const esPorHora = req.tipo_cobro === 'por_hora';
      const cantReq = esPorHora ? Number(req.horas || duracionHoras) : Number(req.cantidad || 1);
      const unidadMedida = esPorHora ? 'horas' : 'servicios';
      recursos.push({
        categoria: 'servicio',
        recurso_nombre: req.descripcion || req.tipo,
        origen_tipo: 'servicio_adicional',
        origen_id: req.id,
        cantidad_requerida: cantReq,
        cantidad_disponible: 0,
        unidad_medida: unidadMedida,
        estado: 'pendiente',
        notas: req.notas || (esPorHora ? `Servicio por hora (${cantReq} h)` : 'Servicio tarifa fija')
      });
    }
  }

  return recursos;
};

/**
 * Sincroniza la lista de recursos calculados con la tabla `evento_balance_recursos`.
 *
 * @param {import('pg').Pool | import('pg').PoolClient} cliente
 * @param {number} eventoId
 * @param {Array<object>} recursosCalculados
 */
const sincronizarTablaBalance = async (cliente, eventoId, recursosCalculados, forzarRecalculo = false) => {
  // Asegurar columna estado_manual
  try {
    await cliente.query('ALTER TABLE evento_balance_recursos ADD COLUMN IF NOT EXISTS estado_manual BOOLEAN DEFAULT false');
  } catch (_) {}

  // Consultar registros ya existentes para preservar posibles fechas límite o notas manuales
  const resExistentes = await cliente.query(
    'SELECT * FROM evento_balance_recursos WHERE evento_id = $1',
    [eventoId]
  );
  const mapaExistentes = new Map();
  for (const r of resExistentes.rows) {
    const claveNombre = `${r.categoria}__${r.recurso_nombre.trim().toLowerCase()}`;
    mapaExistentes.set(claveNombre, r);
    if (r.origen_tipo && r.origen_id) {
      mapaExistentes.set(`origen__${r.origen_tipo}__${r.origen_id}`, r);
    }
  }

  const idsConservados = [];

  for (const rec of recursosCalculados) {
    const claveNombre = `${rec.categoria}__${rec.recurso_nombre.trim().toLowerCase()}`;
    const claveOrigen = rec.origen_tipo && rec.origen_id ? `origen__${rec.origen_tipo}__${rec.origen_id}` : null;
    const existente = (claveOrigen && mapaExistentes.get(claveOrigen)) || mapaExistentes.get(claveNombre);

    if (existente) {
      let estadoFinal = rec.estado;
      let estadoManualFinal = false;

      // Si no se fuerza la sincronización y el usuario modificó manualmente el estado,
      // solo se conserva si las cantidades requeridas y disponibles NO han cambiado.
      if (!forzarRecalculo && existente.estado_manual) {
        const reqIgual = Number(existente.cantidad_requerida) === Number(rec.cantidad_requerida);
        const dispIgual = Number(existente.cantidad_disponible) === Number(rec.cantidad_disponible);
        if (reqIgual && dispIgual) {
          estadoFinal = existente.estado;
          estadoManualFinal = true;
        }
      }

      // Actualizar cantidades, estado, estado_manual y notas
      await cliente.query(
        `UPDATE evento_balance_recursos
         SET recurso_nombre = $1,
             cantidad_requerida = $2,
             cantidad_disponible = $3,
             unidad_medida = $4,
             estado = $5,
             estado_manual = $6,
             notas = COALESCE($7, notas),
             actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $8`,
        [
          rec.recurso_nombre,
          rec.cantidad_requerida,
          rec.cantidad_disponible,
          rec.unidad_medida,
          estadoFinal,
          estadoManualFinal,
          rec.notas,
          existente.id
        ]
      );
      idsConservados.push(existente.id);
    } else {
      // Insertar nuevo recurso en el balance
      const resInsert = await cliente.query(
        `INSERT INTO evento_balance_recursos
         (evento_id, categoria, recurso_nombre, origen_tipo, origen_id, cantidad_requerida, cantidad_disponible, unidad_medida, estado, notas)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          eventoId,
          rec.categoria,
          rec.recurso_nombre,
          rec.origen_tipo,
          rec.origen_id,
          rec.cantidad_requerida,
          rec.cantidad_disponible,
          rec.unidad_medida,
          rec.estado,
          rec.notas
        ]
      );
      idsConservados.push(resInsert.rows[0].id);
    }
  }

  // Eliminar recursos obsoletos que ya no aplican al evento
  if (idsConservados.length > 0) {
    await cliente.query(
      'DELETE FROM evento_balance_recursos WHERE evento_id = $1 AND id <> ALL($2::int[])',
      [eventoId, idsConservados]
    );
  } else {
    await cliente.query('DELETE FROM evento_balance_recursos WHERE evento_id = $1', [eventoId]);
  }

  // Retornar la lista definitiva guardada
  const { rows } = await cliente.query(
    'SELECT * FROM evento_balance_recursos WHERE evento_id = $1 ORDER BY categoria, id ASC',
    [eventoId]
  );
  return rows;
};

/**
 * Normaliza y valida el ID de evento, aceptando enteros o códigos como 'evt-201'
 */
const parseEventoId = (raw) => {
  if (typeof raw === 'number' && Number.isInteger(raw) && raw > 0 && raw <= 2147483647) {
    return raw;
  }
  const str = String(raw || '').trim();
  const match = str.match(/^(?:evt-|event-)?(\d+)$/i);
  if (match) {
    const num = Number(match[1]);
    if (Number.isInteger(num) && num > 0 && num <= 2147483647) {
      return num;
    }
  }
  return null;
};

/**
 * Enumerador estricto de estados para la capa de presentación / API (HU-32 · RF-41).
 * Nota de negocio: NO existe el valor BOUGHT ni COMPRADO en este Enum.
 */
const ResourceStatus = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  TO_BUY: 'TO_BUY',
  TO_PROCURE: 'TO_PROCURE',
  PENDING: 'PENDING'
});

/**
 * Determina el estado estricto (ResourceStatus) según las reglas de negocio de la HU-32 (RF-41):
 * - Si deficit_quantity <= 0: obligatoriamente AVAILABLE.
 * - Si internamente figura como comprado o adquirido: se transforma a AVAILABLE (sin exponer "comprado").
 * - Si hay orden de compra en curso o compras de alimentos/bebidas pendientes: TO_BUY.
 * - Si hay solicitud de alquiler o personal por conseguir: TO_PROCURE.
 * - Si hay déficit sin gestión o pendiente: PENDING (Escenario 3).
 *
 * @param {object} item
 * @returns {'AVAILABLE' | 'TO_BUY' | 'TO_PROCURE' | 'PENDING'}
 */
const determinarResourceStatus = (item) => {
  const req = Number(item.cantidad_requerida != null ? item.cantidad_requerida : (item.required_quantity || 0));
  const disp = Number(item.cantidad_disponible != null ? item.cantidad_disponible : (item.available_quantity || 0));
  const deficit = Number(item.deficit_quantity != null ? item.deficit_quantity : Math.max(0, req - disp));

  // Regla 1 (RF-41): Si deficit_quantity == 0 (o menor), el estado es obligatoriamente AVAILABLE
  if (deficit <= 0) {
    return ResourceStatus.AVAILABLE;
  }

  const estadoNorm = String(item.estado || item.status || '').trim().toLowerCase();

  // Regla 2 (Exclusión "Comprado" · Escenario 2): todo recurso adquirido o comprado se mapea a AVAILABLE
  if (['comprado', 'adquirido', 'bought', 'purchased', 'disponible', 'available', 'listo', 'hecho'].includes(estadoNorm)) {
    return ResourceStatus.AVAILABLE;
  }

  // Regla 3: Si hay orden de compra en curso o insumos de cocina/alimentos a comprar -> TO_BUY
  if (item.orden_compra_en_curso || estadoNorm === 'por_comprar' || estadoNorm === 'to_buy' || item.categoria === 'alimento') {
    return ResourceStatus.TO_BUY;
  }

  // Regla 4: Si hay solicitud de alquiler en curso o personal requerido por conseguir -> TO_PROCURE
  if (item.alquiler_en_curso || estadoNorm === 'por_conseguir' || estadoNorm === 'to_procure' || item.categoria === 'personal') {
    return ResourceStatus.TO_PROCURE;
  }

  // Regla 5 (Escenario 3): Déficit sin gestión asociada o pendiente -> PENDING
  return ResourceStatus.PENDING;
};

/**
 * Agrupa los recursos y genera las métricas de resumen y el DTO jerárquico del balance
 * (HU-31, HU-32 · RF-39, RF-40, RF-41).
 *
 * @param {number} eventoId
 * @param {Array<object>} filas
 * @param {object} [infoEvento] - Información básica del evento (id, nombre_evento, asistentes)
 */
const estructurarRespuestaBalance = (eventoId, filas, infoEvento = null) => {
  const recursos = filas.map((r) => {
    const cantReq = parseFloat(r.cantidad_requerida) || 0;
    const cantDisp = parseFloat(r.cantidad_disponible) || 0;
    const deficit = Math.max(0, cantReq - cantDisp);

    const statusVal = determinarResourceStatus({
      deficit_quantity: deficit,
      estado: r.estado,
      status: r.status,
      categoria: r.categoria,
      cantidad_requerida: cantReq,
      cantidad_disponible: cantDisp,
      orden_compra_en_curso: r.orden_compra_en_curso,
      alquiler_en_curso: r.alquiler_en_curso
    });

    // Mapear estado interno amigable en español para la UI
    let estadoEs = 'pendiente';
    if (statusVal === ResourceStatus.AVAILABLE) estadoEs = 'disponible';
    else if (statusVal === ResourceStatus.TO_BUY) estadoEs = 'por_comprar';
    else if (statusVal === ResourceStatus.TO_PROCURE) estadoEs = 'por_conseguir';
    else if (statusVal === ResourceStatus.PENDING) estadoEs = 'pendiente';

    return {
      id: r.id,
      evento_id: r.evento_id,
      categoria: r.categoria,
      recurso_nombre: r.recurso_nombre,
      item_name: r.recurso_nombre,
      origen_tipo: r.origen_tipo,
      origen_id: r.origen_id,
      cantidad_requerida: cantReq,
      required_quantity: cantReq,
      cantidad_disponible: cantDisp,
      available_quantity: cantDisp,
      deficit_quantity: deficit,
      unidad_medida: r.unidad_medida,
      unit: r.unidad_medida,
      estado: estadoEs,
      status: statusVal, // Enum ResourceStatus (HU-32 · RF-41)
      fecha_limite: r.fecha_limite ? String(r.fecha_limite).slice(0, 10) : null,
      notas: r.notas,
      creado_en: r.creado_en,
      actualizado_en: r.actualizado_en
    };
  });

  const recursosPorCategoria = {
    personal: [],
    alimento: [],
    bebida: [],
    mobiliario: [],
    servicio: []
  };

  let disponibles = 0;
  let porComprar = 0;
  let porConseguir = 0;
  let pendientes = 0;

  for (const item of recursos) {
    if (recursosPorCategoria[item.categoria]) {
      recursosPorCategoria[item.categoria].push(item);
    }
    if (item.estado === 'disponible') disponibles++;
    else if (item.estado === 'por_comprar') porComprar++;
    else if (item.estado === 'por_conseguir') porConseguir++;
    else if (item.estado === 'pendiente') pendientes++;
  }

  const total = recursos.length;
  const porcentaje = total > 0 ? Math.round((disponibles / total) * 100) : 100;

  // DTO jerárquico por categoría (LogisticsBalanceResponse - QA Sprint 5 / RF-40, RF-41)
  const categories = [
    {
      category_name: 'STAFF',
      category_label: 'Personal',
      items: recursosPorCategoria.personal.map((i) => ({
        item_name: i.item_name,
        required_quantity: i.required_quantity,
        available_quantity: i.available_quantity,
        deficit_quantity: i.deficit_quantity,
        unit: i.unit,
        status: i.status
      }))
    },
    {
      category_name: 'FOOD',
      category_label: 'Alimentos',
      items: recursosPorCategoria.alimento.map((i) => ({
        item_name: i.item_name,
        required_quantity: i.required_quantity,
        available_quantity: i.available_quantity,
        deficit_quantity: i.deficit_quantity,
        unit: i.unit,
        status: i.status
      }))
    },
    {
      category_name: 'DRINKS',
      category_label: 'Bebidas',
      items: recursosPorCategoria.bebida.map((i) => ({
        item_name: i.item_name,
        required_quantity: i.required_quantity,
        available_quantity: i.available_quantity,
        deficit_quantity: i.deficit_quantity,
        unit: i.unit,
        status: i.status
      }))
    },
    {
      category_name: 'FURNITURE',
      category_label: 'Mobiliario',
      items: recursosPorCategoria.mobiliario.map((i) => ({
        item_name: i.item_name,
        required_quantity: i.required_quantity,
        available_quantity: i.available_quantity,
        deficit_quantity: i.deficit_quantity,
        unit: i.unit,
        status: i.status
      }))
    }
  ];

  if (recursosPorCategoria.servicio && recursosPorCategoria.servicio.length > 0) {
    categories.push({
      category_name: 'OTHER',
      category_label: 'Servicios',
      items: recursosPorCategoria.servicio.map((i) => ({
        item_name: i.item_name,
        required_quantity: i.required_quantity,
        available_quantity: i.available_quantity,
        deficit_quantity: i.deficit_quantity,
        unit: i.unit,
        status: i.status
      }))
    });
  }

  return {
    // 1. DTO oficial del contrato técnico (QA Sprint 5)
    event_id: infoEvento ? String(infoEvento.id) : String(eventoId),
    event_name: infoEvento?.nombre_evento || 'Evento',
    guest_count: infoEvento ? Number(infoEvento.asistentes) : 0,
    categories,

    // 2. Propiedades de retrocompatibilidad con la UI de la aplicación (HU-31)
    evento_id: eventoId,
    resumen: {
      total_recursos: total,
      disponibles,
      por_comprar: porComprar,
      por_conseguir: porConseguir,
      pendientes,
      porcentaje_completitud: porcentaje
    },
    recursos,
    recursos_por_categoria: recursosPorCategoria,
    faltantes_anticipados: recursos.filter((r) => r.estado !== 'disponible')
  };
};

/**
 * GET /api/eventos/:id/balance
 * GET /api/v1/events/:eventId/logistics-balance
 * Obtiene el balance logístico del evento (HU-31 · RF-39, RF-40).
 */
const obtenerBalanceEvento = async (req, res) => {
  const rawId = req.params.id || req.params.eventId;
  const eventoId = parseEventoId(rawId);
  if (!eventoId) {
    return res.status(400).json({ error: 'Datos inválidos', detalle: 'El identificador del evento no es válido.' });
  }

  const client = await pool.connect();
  try {
    // 1. Verificar si el evento existe
    const resEvento = await client.query('SELECT id, nombre_evento, asistentes FROM eventos WHERE id = $1', [eventoId]);
    if (resEvento.rows.length === 0) {
      return res.status(404).json({
        error: 'Evento no encontrado',
        detalle: 'No es posible generar un balance para un evento inexistente.'
      });
    }

    const infoEvento = resEvento.rows[0];

    // 2. Calcular automáticamente y mantener sincronizado el balance
    const calculados = await calcularRecursosEvento(client, eventoId);
    const filas = await sincronizarTablaBalance(client, eventoId, calculados || []);

    res.json(estructurarRespuestaBalance(eventoId, filas, infoEvento));
  } catch (error) {
    console.error('Error al obtener balance logístico (HU-31):', error);
    res.status(500).json({ error: 'Error al obtener el balance logístico', detalle: error.message });
  } finally {
    client.release();
  }
};

/**
 * POST /api/eventos/:id/balance/sincronizar
 * Regenera o sincroniza el balance con los requerimientos actuales del evento.
 */
const sincronizarBalanceEvento = async (req, res) => {
  const rawId = req.params.id || req.params.eventId;
  const eventoId = parseEventoId(rawId);
  if (!eventoId) {
    return res.status(400).json({ error: 'Datos inválidos', detalle: 'El identificador del evento no es válido.' });
  }

  const client = await pool.connect();
  try {
    const resEvento = await client.query('SELECT id, nombre_evento, asistentes FROM eventos WHERE id = $1', [eventoId]);
    if (resEvento.rows.length === 0) {
      return res.status(404).json({
        error: 'Evento no encontrado',
        detalle: 'No es posible generar un balance para un evento inexistente.'
      });
    }

    const infoEvento = resEvento.rows[0];
    const calculados = await calcularRecursosEvento(client, eventoId);
    const filas = await sincronizarTablaBalance(client, eventoId, calculados || [], true);

    res.json(estructurarRespuestaBalance(eventoId, filas, infoEvento));
  } catch (error) {
    console.error('Error al sincronizar balance logístico (HU-31):', error);
    res.status(500).json({ error: 'Error al sincronizar el balance logístico', detalle: error.message });
  } finally {
    client.release();
  }
};

/**
 * PATCH /api/eventos/:id/balance/recursos/:recursoId
 * Modifica manualmente el estado de un recurso del balance logístico (HU-31).
 * Estados permitidos: disponible (listo / hecho), por_comprar, por_conseguir, pendiente.
 */
const cambiarEstadoRecursoBalance = async (req, res) => {
  const eventoId = parseEventoId(req.params.id || req.params.eventId);
  const recursoId = Number(req.params.recursoId || req.params.itemId);

  if (!eventoId) {
    return res.status(400).json({ error: 'Datos inválidos', detalle: 'El identificador del evento no es válido.' });
  }

  if (!Number.isInteger(recursoId) || recursoId <= 0) {
    return res.status(400).json({ error: 'Datos inválidos', detalle: 'El identificador del recurso no es válido.' });
  }

  const estadoCrudo = String(req.body?.estado || req.body?.status || '').trim().toLowerCase();
  let estadoNormalizado = null;

  if (estadoCrudo === 'disponible' || estadoCrudo === 'listo' || estadoCrudo === 'hecho' || estadoCrudo === 'ready') {
    estadoNormalizado = 'disponible';
  } else if (estadoCrudo === 'por_comprar' || estadoCrudo === 'comprar') {
    estadoNormalizado = 'por_comprar';
  } else if (estadoCrudo === 'por_conseguir' || estadoCrudo === 'conseguir') {
    estadoNormalizado = 'por_conseguir';
  } else if (estadoCrudo === 'pendiente' || estadoCrudo === 'pending') {
    estadoNormalizado = 'pendiente';
  }

  if (!estadoNormalizado) {
    return res.status(400).json({
      error: 'Datos inválidos',
      detalle: 'El estado debe ser uno de: disponible (listo), por_comprar, por_conseguir o pendiente.'
    });
  }

  const client = await pool.connect();
  try {
    try {
      await client.query('ALTER TABLE evento_balance_recursos ADD COLUMN IF NOT EXISTS estado_manual BOOLEAN DEFAULT false');
    } catch (_) {}

    const resUpdate = await client.query(
      `UPDATE evento_balance_recursos
       SET estado = $1,
           estado_manual = true,
           actualizado_en = CURRENT_TIMESTAMP
       WHERE id = $2 AND evento_id = $3
       RETURNING *`,
      [estadoNormalizado, recursoId, eventoId]
    );

    if (resUpdate.rows.length === 0) {
      return res.status(404).json({
        error: 'Recurso no encontrado',
        detalle: 'No se encontró el recurso especificado para este evento.'
      });
    }

    // Retornar balance actualizado
    const resEvento = await client.query('SELECT id, nombre_evento, asistentes FROM eventos WHERE id = $1', [eventoId]);
    const infoEvento = resEvento.rows[0];
    const { rows: filas } = await client.query(
      'SELECT * FROM evento_balance_recursos WHERE evento_id = $1 ORDER BY categoria, id ASC',
      [eventoId]
    );

    res.json({
      mensaje: 'Estado del recurso actualizado exitosamente',
      recurso: resUpdate.rows[0],
      balance: estructurarRespuestaBalance(eventoId, filas, infoEvento)
    });
  } catch (error) {
    console.error('Error al cambiar estado del recurso en balance (HU-31):', error);
    res.status(500).json({ error: 'Error al cambiar estado del recurso', detalle: error.message });
  } finally {
    client.release();
  }
};

module.exports = {
  ResourceStatus,
  determinarResourceStatus,
  parseEventoId,
  calcularRecursosEvento,
  sincronizarTablaBalance,
  estructurarRespuestaBalance,
  obtenerBalanceEvento,
  sincronizarBalanceEvento,
  cambiarEstadoRecursoBalance
};
