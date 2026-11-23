/**
 * Pruebas unitarias y de integración para HU-31 ("Generar balance logístico").
 * Cubre:
 * - RF-39: Generación automática del balance logístico del evento.
 * - RF-40: Consolidación de los 5 pilares: personal, alimentos, bebidas, mobiliario y servicios adicionales.
 * - Cálculo de métricas: total, disponibles, por comprar, por conseguir, pendientes y porcentaje de completitud.
 * - Validación de entradas y manejo de errores en rutas y controlador.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ResourceStatus,
  determinarResourceStatus,
  estructurarRespuestaBalance,
  calcularRecursosEvento,
  obtenerBalanceEvento,
  sincronizarBalanceEvento
} = require('../src/controllers/balanceController');

test('HU-31 / RF-39, RF-40: estructurarRespuestaBalance calcula métricas y agrupa categorías correctamente', () => {
  const filasMock = [
    {
      id: 1,
      evento_id: 10,
      categoria: 'personal',
      recurso_nombre: 'Meseros',
      origen_tipo: 'personal',
      origen_id: null,
      cantidad_requerida: '5.00',
      cantidad_disponible: '5.00',
      unidad_medida: 'personas',
      estado: 'disponible',
      fecha_limite: null,
      notas: 'Asignados: 5'
    },
    {
      id: 2,
      evento_id: 10,
      categoria: 'personal',
      recurso_nombre: 'Cocineros',
      origen_tipo: 'personal',
      origen_id: null,
      cantidad_requerida: '8.00',
      cantidad_disponible: '4.00',
      unidad_medida: 'personas',
      estado: 'por_conseguir',
      fecha_limite: null,
      notas: 'Asignados: 4'
    },
    {
      id: 3,
      evento_id: 10,
      categoria: 'alimento',
      recurso_nombre: 'Pechuga de pollo',
      origen_tipo: 'ingrediente',
      origen_id: 5,
      cantidad_requerida: '22.00',
      cantidad_disponible: '0.00',
      unidad_medida: 'kilos',
      estado: 'por_comprar',
      fecha_limite: null,
      notas: 'Para: Arroz especial'
    },
    {
      id: 4,
      evento_id: 10,
      categoria: 'bebida',
      recurso_nombre: 'Vino Tinto Reserva',
      origen_tipo: 'producto_catalogo',
      origen_id: 12,
      cantidad_requerida: '20.00',
      cantidad_disponible: '20.00',
      unidad_medida: 'botellas',
      estado: 'disponible',
      fecha_limite: null,
      notas: 'Stock disponible en inventario: 25'
    },
    {
      id: 5,
      evento_id: 10,
      categoria: 'mobiliario',
      recurso_nombre: 'Sillas Tiffany',
      origen_tipo: 'producto_catalogo',
      origen_id: 2,
      cantidad_requerida: '100.00',
      cantidad_disponible: '40.00',
      unidad_medida: 'unidades',
      estado: 'por_conseguir',
      fecha_limite: null,
      notas: '40 unidades propias disponibles · 60 unidades por alquilar'
    },
    {
      id: 6,
      evento_id: 10,
      categoria: 'servicio',
      recurso_nombre: 'DJ Profesional',
      origen_tipo: 'servicio_adicional',
      origen_id: 99,
      cantidad_requerida: '6.00',
      cantidad_disponible: '0.00',
      unidad_medida: 'horas',
      estado: 'pendiente',
      fecha_limite: null,
      notas: 'Servicio por hora (6 h)'
    }
  ];

  const resultado = estructurarRespuestaBalance(10, filasMock);

  assert.equal(resultado.evento_id, 10);
  assert.equal(resultado.resumen.total_recursos, 6);
  assert.equal(resultado.resumen.disponibles, 2);
  assert.equal(resultado.resumen.por_comprar, 1);
  assert.equal(resultado.resumen.por_conseguir, 2);
  assert.equal(resultado.resumen.pendientes, 1);
  // Completitud: 2 disponibles de 6 total = 33%
  assert.equal(resultado.resumen.porcentaje_completitud, 33);

  // Verificación de los 5 pilares / categorías
  assert.equal(resultado.recursos_por_categoria.personal.length, 2);
  assert.equal(resultado.recursos_por_categoria.alimento.length, 1);
  assert.equal(resultado.recursos_por_categoria.bebida.length, 1);
  assert.equal(resultado.recursos_por_categoria.mobiliario.length, 1);
  assert.equal(resultado.recursos_por_categoria.servicio.length, 1);

  // Faltantes anticipados: todos los que no están 'disponible' (4 en total)
  assert.equal(resultado.faltantes_anticipados.length, 4);
});

test('HU-31: estructurarRespuestaBalance maneja balance vacío', () => {
  const resultado = estructurarRespuestaBalance(99, []);
  assert.equal(resultado.evento_id, 99);
  assert.equal(resultado.resumen.total_recursos, 0);
  assert.equal(resultado.resumen.disponibles, 0);
  assert.equal(resultado.resumen.porcentaje_completitud, 100);
  assert.equal(resultado.recursos.length, 0);
  assert.equal(resultado.faltantes_anticipados.length, 0);
});

test('HU-31 / RF-40: calcularRecursosEvento consolida correctamente datos del cliente', async () => {
  // Simulamos un cliente de base de datos con respuestas a las distintas consultas
  const mockClient = {
    query: async (sql, params) => {
      // 1. Evento
      if (sql.includes('FROM eventos WHERE id')) {
        return {
          rows: [
            {
              id: 1,
              nombre_evento: 'Gala Anual',
              asistentes: 100,
              duracion_horas: 6,
              estado: 'planificacion'
            }
          ]
        };
      }
      // 2. Personal asignado
      if (sql.includes('FROM evento_personal ep')) {
        return {
          rows: [
            { rol: 'mesero', asignados: 5 },
            { rol: 'cocinero', asignados: 6 }
          ]
        };
      }
      // 3. Bebidas catálogo
      if (sql.includes('clasificacion = \'bebida_general\'')) {
        return {
          rows: [
            {
              producto_id: 10,
              nombre: 'Gaseosa Postobón 2L',
              cantidad_con_margen: 15,
              unidad_entrega: 'botellas',
              es_propio: true,
              stock_propio: 15
            }
          ]
        };
      }
      // 4. Requerimientos adicionales (mobiliario y servicios)
      if (sql.includes('FROM requerimientos_adicionales r')) {
        return {
          rows: [
            {
              id: 101,
              tipo: 'mobiliario',
              descripcion: 'Mesas Redondas 10 personas',
              cantidad: 10,
              horas: null,
              tipo_cobro: 'fijo',
              notas: null,
              producto_id: 50,
              es_propio: true,
              stock_propio: 6,
              unidades_propias: 6,
              unidades_alquilar: 4
            },
            {
              id: 102,
              tipo: 'fotografia',
              descripcion: 'Fotógrafo para recepción',
              cantidad: 1,
              horas: 4,
              tipo_cobro: 'por_hora',
              notas: 'Cobertura fotográfica completa',
              producto_id: null,
              es_propio: false,
              stock_propio: 0,
              unidades_propias: 0,
              unidades_alquilar: 0
            }
          ]
        };
      }
      // Por defecto para otras consultas (compras, cocteles)
      return { rows: [] };
    }
  };

  const recursos = await calcularRecursosEvento(mockClient, 1);
  assert.ok(Array.isArray(recursos));

  // Personal:
  // 100 asistentes -> 100/20 = 5 meseros requeridos. Asignados: 5 -> estado 'disponible'
  const meseros = recursos.find((r) => r.categoria === 'personal' && r.recurso_nombre === 'Meseros');
  assert.ok(meseros);
  assert.equal(meseros.cantidad_requerida, 5);
  assert.equal(meseros.cantidad_disponible, 5);
  assert.equal(meseros.estado, 'disponible');

  // Cocineros: 100 asistentes -> 8 cocineros requeridos. Asignados: 6 -> estado 'por_conseguir'
  const cocineros = recursos.find((r) => r.categoria === 'personal' && r.recurso_nombre === 'Cocineros');
  assert.ok(cocineros);
  assert.equal(cocineros.cantidad_requerida, 8);
  assert.equal(cocineros.cantidad_disponible, 6);
  assert.equal(cocineros.estado, 'por_conseguir');

  // Mobiliario: Mesas Redondas (10 requeridas, 6 propias, 4 por alquilar) -> 'por_conseguir'
  const mobiliario = recursos.find((r) => r.categoria === 'mobiliario');
  assert.ok(mobiliario);
  assert.equal(mobiliario.cantidad_requerida, 10);
  assert.equal(mobiliario.cantidad_disponible, 6);
  assert.equal(mobiliario.estado, 'por_conseguir');

  // Servicio adicional: Fotógrafo (4 horas) -> 'pendiente'
  const servicio = recursos.find((r) => r.categoria === 'servicio');
  assert.ok(servicio);
  assert.equal(servicio.cantidad_requerida, 4);
  assert.equal(servicio.unidad_medida, 'horas');
  assert.equal(servicio.estado, 'pendiente');
});

test('HU-31: controladores rechazan id de evento inválido', async () => {
  const casos = ['abc', -5, 0, '2147483648', null, undefined, '1.5'];

  for (const caso of casos) {
    let statusObtener = null;
    let jsonObtener = null;
    const req = { params: { id: caso }, query: {} };
    const res = {
      status: (code) => {
        statusObtener = code;
        return {
          json: (data) => {
            jsonObtener = data;
          }
        };
      }
    };

    await obtenerBalanceEvento(req, res);
    assert.equal(statusObtener, 400, `obtenerBalanceEvento debió rechazar id: ${caso}`);
    assert.match(jsonObtener.detalle, /no es válido/);

    let statusSincronizar = null;
    let jsonSincronizar = null;
    const resSinc = {
      status: (code) => {
        statusSincronizar = code;
        return {
          json: (data) => {
            jsonSincronizar = data;
          }
        };
      }
    };
    await sincronizarBalanceEvento(req, resSinc);
    assert.equal(statusSincronizar, 400, `sincronizarBalanceEvento debió rechazar id: ${caso}`);
  }
});

test('HU-31 / RF-39: sincronizarTablaBalance actualiza el estado cuando un recurso pasa a estar disponible', async () => {
  const { sincronizarTablaBalance } = require('../src/controllers/balanceController');

  let updateParams = null;
  const mockClient = {
    query: async (sql, params) => {
      if (sql.includes('SELECT * FROM evento_balance_recursos WHERE evento_id = $1')) {
        return {
          rows: [
            {
              id: 42,
              evento_id: 5,
              categoria: 'personal',
              recurso_nombre: 'Meseros',
              origen_tipo: 'personal',
              origen_id: null,
              cantidad_requerida: 2,
              cantidad_disponible: 0,
              unidad_medida: 'personas',
              estado: 'por_conseguir',
              notas: 'Asignados: 0'
            }
          ]
        };
      }
      if (sql.includes('UPDATE evento_balance_recursos')) {
        updateParams = params;
        return { rows: [] };
      }
      return { rows: [] };
    }
  };

  const recursosNuevos = [
    {
      categoria: 'personal',
      recurso_nombre: 'Meseros',
      origen_tipo: 'personal',
      origen_id: null,
      cantidad_requerida: 2,
      cantidad_disponible: 2,
      unidad_medida: 'personas',
      estado: 'disponible',
      notas: 'Asignados: 2'
    }
  ];

  await sincronizarTablaBalance(mockClient, 5, recursosNuevos);

  assert.ok(updateParams, 'Debe haber ejecutado UPDATE sobre evento_balance_recursos');
  // Param $5 debe ser el estado ('disponible')
  assert.equal(updateParams[4], 'disponible', 'El estado debe actualizarse a disponible');
  // Param $3 debe ser cantidad_disponible (2)
  assert.equal(updateParams[2], 2, 'La cantidad disponible debe actualizarse a 2');
});

test('HU-31 / RF-40: los licores para cócteles descuentan o cubren con stock de inventario propio', async () => {
  const mockClient = {
    query: async (sql, params) => {
      if (sql.includes('FROM eventos WHERE id')) {
        return {
          rows: [
            { id: 1, nombre_evento: 'Boda Campestre', asistentes: 50, duracion_horas: 6, estado: 'planificacion' }
          ]
        };
      }
      if (sql.includes('FROM evento_personal ep')) {
        return { rows: [] };
      }
      if (sql.includes('FROM evento_productos ep')) {
        // Para cocteles del evento (clasificacion = 'bar_cocteleria')
        if (sql.includes('bar_cocteleria')) {
          return { rows: [{ producto_id: 88, porcion_por_persona: 1 }] };
        }
        return { rows: [] };
      }
      if (sql.includes('FROM cocteles c') || sql.includes('LOWER(TRIM(c.nombre))')) {
        return {
          rows: [{ coctel_id: 1, coctel_nombre: 'CUMtel', producto_id: 88, producto_nombre: 'CUMtel', coctel_activo: true }]
        };
      }
      if (sql.includes('FROM coctel_ingredientes ci')) {
        return {
          rows: [
            {
              coctel_id: 1,
              licor_id: 99,
              mililitros: 45,
              nombre_licor: 'Aguardiente Blanco del Valle',
              volumen_botella_ml: 750,
              precio_unitario: 40000
            }
          ]
        };
      }
      if (sql.includes('categoria_inventario IS NOT NULL')) {
        // Inventario físico: hay 16 botellas de Aguardiente en bodega
        return {
          rows: [
            { id: 99, cantidad_propia: 16, es_propio: true }
          ]
        };
      }
      return { rows: [] };
    }
  };

  const recursos = await calcularRecursosEvento(mockClient, 1);
  const licor = recursos.find((r) => r.categoria === 'bebida' && r.recurso_nombre === 'Aguardiente Blanco del Valle');

  assert.ok(licor, 'Debe encontrar el Aguardiente en los recursos');
  // 50 asistentes * 1 cóctel * 45 ml = 2250 ml -> con 10% margen = 2475 ml -> ceil(2475/750) = 4 botellas
  assert.equal(licor.cantidad_requerida, 4);
  // Al tener 16 botellas en inventario propio, la cantidad disponible debe cubrir las 4 requeridas
  assert.equal(licor.cantidad_disponible, 4);
  assert.equal(licor.estado, 'disponible', 'Al haber suficiente stock en inventario, el estado debe ser disponible');
  assert.match(licor.notas, /Cubierto con inventario/);
});

test('HU-31 / QA Contrato: parseEventoId valida y normaliza identificadores numéricos y prefijados', () => {
  const { parseEventoId } = require('../src/controllers/balanceController');

  assert.equal(parseEventoId(201), 201);
  assert.equal(parseEventoId('201'), 201);
  assert.equal(parseEventoId('evt-201'), 201);
  assert.equal(parseEventoId('EVT-50'), 50);
  assert.equal(parseEventoId('event-12'), 12);

  // Casos inválidos
  assert.equal(parseEventoId('abc'), null);
  assert.equal(parseEventoId(0), null);
  assert.equal(parseEventoId(-10), null);
  assert.equal(parseEventoId('evt-'), null);
  assert.equal(parseEventoId('evt-abc'), null);
  assert.equal(parseEventoId(null), null);
  assert.equal(parseEventoId(undefined), null);
});

test('HU-31 / QA Escenario 1: Generación completa con estructura jerárquica LogisticsBalanceResponse', () => {
  const filasMock = [
    {
      id: 1,
      evento_id: 101,
      categoria: 'personal',
      recurso_nombre: 'Meseros',
      origen_tipo: 'personal',
      origen_id: null,
      cantidad_requerida: '5.00',
      cantidad_disponible: '3.00',
      unidad_medida: 'personas',
      estado: 'por_conseguir',
      notas: 'Asignados: 3'
    },
    {
      id: 2,
      evento_id: 101,
      categoria: 'alimento',
      recurso_nombre: 'Lomo de res',
      origen_tipo: 'ingrediente',
      origen_id: 1,
      cantidad_requerida: '20.00',
      cantidad_disponible: '0.00',
      unidad_medida: 'kilos',
      estado: 'por_comprar',
      notas: 'Para menú principal'
    },
    {
      id: 3,
      evento_id: 101,
      categoria: 'bebida',
      recurso_nombre: 'Vino Tinto',
      origen_tipo: 'producto_catalogo',
      origen_id: 2,
      cantidad_requerida: '15.00',
      cantidad_disponible: '15.00',
      unidad_medida: 'botellas',
      estado: 'disponible',
      notas: 'Stock disponible en inventario: 20'
    },
    {
      id: 4,
      evento_id: 101,
      categoria: 'mobiliario',
      recurso_nombre: 'Sillas Tiffany',
      origen_tipo: 'producto_catalogo',
      origen_id: 3,
      cantidad_requerida: '50.00',
      cantidad_disponible: '50.00',
      unidad_medida: 'unidades',
      estado: 'disponible',
      notas: 'Stock en inventario propio: 50'
    },
    {
      id: 5,
      evento_id: 101,
      categoria: 'servicio',
      recurso_nombre: 'Sonido e Iluminación',
      origen_tipo: 'servicio_adicional',
      origen_id: 4,
      cantidad_requerida: '1.00',
      cantidad_disponible: '0.00',
      unidad_medida: 'servicios',
      estado: 'pendiente',
      notas: 'Servicio tarifa fija'
    }
  ];

  const infoEvento = { id: 101, nombre_evento: 'Gala Corporativa', asistentes: 100 };
  const respuesta = estructurarRespuestaBalance(101, filasMock, infoEvento);

  // Verificación DTO raíz
  assert.equal(respuesta.event_id, '101');
  assert.equal(respuesta.event_name, 'Gala Corporativa');
  assert.equal(respuesta.guest_count, 100);
  assert.ok(Array.isArray(respuesta.categories));

  // Verificación de categorías requeridas por el contrato técnico
  const categoryNames = respuesta.categories.map((c) => c.category_name);
  assert.ok(categoryNames.includes('STAFF'), 'Debe incluir STAFF');
  assert.ok(categoryNames.includes('FOOD'), 'Debe incluir FOOD');
  assert.ok(categoryNames.includes('DRINKS'), 'Debe incluir DRINKS');
  assert.ok(categoryNames.includes('FURNITURE'), 'Debe incluir FURNITURE');
  assert.ok(categoryNames.includes('OTHER'), 'Debe incluir OTHER');

  // Verificación de estructura interna de cada ítem
  const staffCat = respuesta.categories.find((c) => c.category_name === 'STAFF');
  assert.ok(staffCat.items.length > 0);
  const meseroItem = staffCat.items[0];
  assert.equal(meseroItem.item_name, 'Meseros');
  assert.equal(meseroItem.required_quantity, 5);
  assert.equal(meseroItem.available_quantity, 3);
  assert.equal(meseroItem.deficit_quantity, 2);
  assert.equal(meseroItem.unit, 'personas');
});

test('HU-31 / QA Escenario 2: Cálculo de déficit para 100 asistentes con 5 meseros requeridos y 3 asignados', async () => {
  const mockClient = {
    query: async (sql, params) => {
      if (sql.includes('FROM eventos WHERE id')) {
        return {
          rows: [
            { id: 201, nombre_evento: 'Boda Campestre', asistentes: 100, duracion_horas: 6, estado: 'planificacion' }
          ]
        };
      }
      if (sql.includes('FROM evento_personal ep')) {
        // 3 meseros asignados confirmados o por confirmar (no_puede no cuenta)
        return {
          rows: [
            { rol: 'mesero', asignados: 3 }
          ]
        };
      }
      return { rows: [] };
    }
  };

  const recursos = await calcularRecursosEvento(mockClient, 201);
  const meseros = recursos.find((r) => r.categoria === 'personal' && r.recurso_nombre === 'Meseros');
  assert.ok(meseros, 'Debe calcular el requerimiento de meseros');

  const dto = estructurarRespuestaBalance(201, [meseros], { id: 201, nombre_evento: 'Boda Campestre', asistentes: 100 });
  const staff = dto.categories.find((c) => c.category_name === 'STAFF');
  const meserosItem = staff.items.find((i) => i.item_name === 'Meseros');

  // Verificaciones exactas del criterio de aceptación:
  // - required_quantity: 5
  // - available_quantity: 3
  // - deficit_quantity: 2
  assert.equal(meserosItem.required_quantity, 5);
  assert.equal(meserosItem.available_quantity, 3);
  assert.equal(meserosItem.deficit_quantity, 2);
});

test('HU-31 / QA Escenario 3: Consulta de balance para evento inexistente responde 404 con mensaje exacto', async () => {
  const pool = require('../src/config/db');
  const originalConnect = pool.connect;

  pool.connect = async () => ({
    query: async (sql, params) => {
      if (sql.includes('FROM eventos WHERE id')) {
        return { rows: [] }; // No existe
      }
      return { rows: [] };
    },
    release: () => {}
  });

  try {
    let statusEnviado = null;
    let bodyEnviado = null;

    const req = {
      params: { eventId: '999999' }
    };
    const res = {
      status: (code) => {
        statusEnviado = code;
        return {
          json: (payload) => {
            bodyEnviado = payload;
          }
        };
      }
    };

    await obtenerBalanceEvento(req, res);

    assert.equal(statusEnviado, 404, 'Debe retornar código 404');
    assert.equal(bodyEnviado.error, 'Evento no encontrado');
    assert.equal(bodyEnviado.detalle, 'No es posible generar un balance para un evento inexistente.');
  } finally {
    pool.connect = originalConnect;
  }
});

test('HU-31 / HU-29: el balance solo cuenta como disponibles a meseros con estado CONFIRMADO', async () => {
  const mockClient = {
    query: async (sql, params) => {
      if (sql.includes('FROM eventos WHERE id')) {
        // 40 asistentes -> 40/20 = 2 meseros requeridos
        return {
          rows: [{ id: 77, nombre_evento: 'Cena Gala', asistentes: 40, duracion_horas: 4, estado: 'planificacion' }]
        };
      }
      if (sql.includes('FROM evento_personal ep')) {
        // 2 meseros asignados: 1 confirmado y 1 por confirmar
        return {
          rows: [
            { rol: 'mesero', estado_asignacion: 'confirmado', asignados: 1 },
            { rol: 'mesero', estado_asignacion: 'por_confirmar', asignados: 1 }
          ]
        };
      }
      return { rows: [] };
    }
  };

  const recursos = await calcularRecursosEvento(mockClient, 77);
  const meseros = recursos.find((r) => r.categoria === 'personal' && r.recurso_nombre === 'Meseros');
  assert.ok(meseros, 'Debe existir el requerimiento de Meseros');

  // Requeridos: 2. Disponibles: solo 1 (el confirmado). Estado: por_conseguir (déficit 1).
  assert.equal(meseros.cantidad_requerida, 2);
  assert.equal(meseros.cantidad_disponible, 1, 'Solo el mesero confirmado debe contar como disponible');
  assert.equal(meseros.estado, 'por_conseguir', 'Al faltar 1 confirmado, el estado debe ser por_conseguir');
  assert.match(meseros.notas, /Confirmados: 1 · Por confirmar: 1/);
});

test('HU-31: cambiarEstadoRecursoBalance actualiza el estado y preserva modificaciones manuales', async () => {
  const { cambiarEstadoRecursoBalance } = require('../src/controllers/balanceController');
  const pool = require('../src/config/db');
  const originalConnect = pool.connect;

  let queryUpdate = null;
  pool.connect = async () => ({
    query: async (sql, params) => {
      if (sql.includes('UPDATE evento_balance_recursos')) {
        queryUpdate = { sql, params };
        return {
          rows: [{ id: 5, evento_id: 10, recurso_nombre: 'Arroz', estado: params[0], estado_manual: true }]
        };
      }
      if (sql.includes('FROM eventos WHERE id')) {
        return { rows: [{ id: 10, nombre_evento: 'Boda', asistentes: 50 }] };
      }
      if (sql.includes('FROM evento_balance_recursos WHERE evento_id = $1')) {
        return {
          rows: [{ id: 5, evento_id: 10, categoria: 'alimento', recurso_nombre: 'Arroz', cantidad_requerida: 4, cantidad_disponible: 0, unidad_medida: 'kilo', estado: 'disponible', estado_manual: true }]
        };
      }
      return { rows: [] };
    },
    release: () => {}
  });

  try {
    let status = null;
    let body = null;
    const req = {
      params: { id: '10', recursoId: '5' },
      body: { estado: 'listo' } // Acepta sinónimo 'listo'
    };
    const res = {
      status: (code) => { status = code; return { json: (d) => { body = d; } }; },
      json: (d) => { status = 200; body = d; }
    };

    await cambiarEstadoRecursoBalance(req, res);

    assert.equal(status, 200);
    assert.equal(body.mensaje, 'Estado del recurso actualizado exitosamente');
    assert.equal(queryUpdate.params[0], 'disponible', 'listo se normaliza a disponible');
    assert.equal(body.recurso.estado, 'disponible');
  } finally {
    pool.connect = originalConnect;
  }
});

// =============================================================================
// HU-32 / RF-41: Consultar estado de los recursos (Sprint 5)
// =============================================================================

test('HU-32 / RF-41: ResourceStatus es un enumerador estricto que no contiene BOUGHT ni COMPRADO', () => {
  assert.equal(ResourceStatus.AVAILABLE, 'AVAILABLE');
  assert.equal(ResourceStatus.TO_BUY, 'TO_BUY');
  assert.equal(ResourceStatus.TO_PROCURE, 'TO_PROCURE');
  assert.equal(ResourceStatus.PENDING, 'PENDING');

  const valores = Object.values(ResourceStatus);
  assert.equal(valores.length, 4, 'El Enum debe tener exactamente 4 estados');
  assert.ok(!valores.includes('BOUGHT'), 'No debe existir el valor BOUGHT en ResourceStatus');
  assert.ok(!valores.includes('COMPRADO'), 'No debe existir el valor COMPRADO en ResourceStatus');
});

test('HU-32 / RF-41 · Escenario 1: Todos y cada uno de los elementos incluyen status estrictamente válido', () => {
  const filasMock = [
    { id: 1, categoria: 'personal', recurso_nombre: 'Meseros', cantidad_requerida: 5, cantidad_disponible: 3, unidad_medida: 'personas', estado: 'por_conseguir' },
    { id: 2, categoria: 'alimento', recurso_nombre: 'Arroz', cantidad_requerida: 4, cantidad_disponible: 0, unidad_medida: 'kilos', estado: 'por_comprar' },
    { id: 3, categoria: 'bebida', recurso_nombre: 'Vino Tinto', cantidad_requerida: 10, cantidad_disponible: 10, unidad_medida: 'botellas', estado: 'disponible' },
    { id: 4, categoria: 'mobiliario', recurso_nombre: 'Centros de mesa', cantidad_requerida: 10, cantidad_disponible: 0, unidad_medida: 'unidades', estado: 'pendiente' },
    { id: 5, categoria: 'servicio', recurso_nombre: 'DJ', cantidad_requerida: 1, cantidad_disponible: 0, unidad_medida: 'servicios', estado: 'pendiente' }
  ];

  const respuesta = estructurarRespuestaBalance(10, filasMock, { id: 10, nombre_evento: 'Evento Test', asistentes: 50 });
  const permitidos = ['AVAILABLE', 'TO_BUY', 'TO_PROCURE', 'PENDING'];

  for (const cat of respuesta.categories) {
    for (const item of cat.items) {
      assert.ok(item.status, `El ítem ${item.item_name} debe incluir el campo status`);
      assert.ok(permitidos.includes(item.status), `El estado ${item.status} debe ser uno de los permitidos`);
    }
  }

  for (const rec of respuesta.recursos) {
    assert.ok(permitidos.includes(rec.status));
  }
});

test('HU-32 / RF-41 · Escenario 2: Transformación del estado "Comprado" a "AVAILABLE" sin exponer "comprado"', () => {
  // Recurso que internamente figura como comprado / adquirido
  const itemComprado = {
    recurso_nombre: 'Vino tinto',
    cantidad_requerida: 12,
    cantidad_disponible: 12,
    deficit_quantity: 0,
    estado: 'comprado'
  };

  const statusDeterminado = determinarResourceStatus(itemComprado);
  assert.equal(statusDeterminado, ResourceStatus.AVAILABLE, 'Debe mapear estado comprado a AVAILABLE');

  // En el DTO consolidado:
  const filasMock = [
    {
      id: 1,
      categoria: 'bebida',
      recurso_nombre: 'Vino tinto',
      cantidad_requerida: 12,
      cantidad_disponible: 12,
      unidad_medida: 'botellas',
      estado: 'comprado'
    }
  ];

  const res = estructurarRespuestaBalance(1, filasMock, { id: 1, nombre_evento: 'Cata', asistentes: 20 });
  const itemVino = res.categories.find((c) => c.category_name === 'DRINKS').items[0];

  assert.equal(itemVino.status, 'AVAILABLE');
  assert.equal(res.recursos[0].status, 'AVAILABLE');
  assert.equal(res.recursos[0].estado, 'disponible');

  const jsonStr = JSON.stringify(res).toLowerCase();
  assert.ok(!jsonStr.includes('"status":"comprado"'), 'No debe exponer status comprado');
  assert.ok(!jsonStr.includes('"status":"bought"'), 'No debe exponer status bought');
});

test('HU-32 / RF-41 · Escenario 3: Estado por defecto ante déficit sin gestión retorna "PENDING"', () => {
  // 50 sillas requeridas, 0 disponibles, sin gestión
  const itemSillas = {
    recurso_nombre: 'Sillas',
    cantidad_requerida: 50,
    cantidad_disponible: 0,
    deficit_quantity: 50,
    estado: 'pendiente',
    orden_compra_en_curso: false,
    alquiler_en_curso: false
  };

  const statusDeterminado = determinarResourceStatus(itemSillas);
  assert.equal(statusDeterminado, ResourceStatus.PENDING, 'Déficit sin gestión retorna por defecto PENDING');

  const filasMock = [
    {
      id: 1,
      categoria: 'mobiliario',
      recurso_nombre: 'Sillas',
      cantidad_requerida: 50,
      cantidad_disponible: 0,
      unidad_medida: 'unidades',
      estado: 'pendiente'
    }
  ];

  const res = estructurarRespuestaBalance(1, filasMock);
  const itemRes = res.categories.find((c) => c.category_name === 'FURNITURE').items[0];
  assert.equal(itemRes.status, 'PENDING');
  assert.equal(itemRes.deficit_quantity, 50);
});

test('HU-32 / RF-41: Si deficit_quantity <= 0 el estado es obligatoriamente AVAILABLE', () => {
  const itemCubierto = {
    cantidad_requerida: 10,
    cantidad_disponible: 10,
    deficit_quantity: 0,
    estado: 'pendiente' // A pesar de tener texto interno raro, si el déficit es 0 debe ser AVAILABLE
  };

  assert.equal(determinarResourceStatus(itemCubierto), ResourceStatus.AVAILABLE);

  const itemSuperavit = {
    cantidad_requerida: 10,
    cantidad_disponible: 15,
    deficit_quantity: 0
  };
  assert.equal(determinarResourceStatus(itemSuperavit), ResourceStatus.AVAILABLE);
});


