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
