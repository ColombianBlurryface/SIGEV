/**
 * Pruebas de HU-35 · Visualizar anticipadamente los faltantes (RF-44).
 *
 * Verifica:
 * - Escenario 1: Consulta filtrada con `?only_missing=true` retorna únicamente recursos con déficit
 *   (`PENDING`, `TO_BUY`, `TO_PROCURE`) y omite completamente los recursos `AVAILABLE` y categorías vacías.
 * - Escenario 2: Cada ítem filtrado incluye su `status` y `deadline_date` proveniente de HU-33.
 * - Escenario 3: Un evento con el 100% de recursos en `AVAILABLE` retorna HTTP 200 OK y `categories: []`.
 * - Integración con HU-34: El filtro `only_missing=true` se aplica DESPUÉS de fusionar marcas manuales (`estado_manual`).
 * - Checklist: Accesible tanto en estado `planificacion` como `confirmado` antes del evento, y rutas expuestas.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  obtenerBalanceEvento,
  sincronizarBalanceEvento,
  cambiarEstadoRecursoBalance,
  establecerFechaLimiteRecurso,
  estructurarRespuestaBalance,
  parseOnlyMissing,
  ResourceStatus
} = require('../src/controllers/balanceController');
const eventosRoutes = require('../src/routes/eventosRoutes');
const pool = require('../src/config/db');

const crearBaseFalsa = ({
  filasIniciales,
  estadoEvento = 'planificacion',
  asistentes = 100,
  personalRows,
  mobiliarioRows
} = {}) => {
  const filas = (filasIniciales || [
    {
      id: 1,
      evento_id: 201,
      categoria: 'personal',
      recurso_nombre: 'Meseros',
      origen_tipo: 'personal',
      origen_id: null,
      cantidad_requerida: 5,
      cantidad_disponible: 3,
      unidad_medida: 'personas',
      estado: 'pendiente',
      estado_manual: false,
      fecha_limite: '2026-10-14',
      notas: '1 por cada 20 asistentes. Confirmados: 3'
    },
    {
      id: 2,
      evento_id: 201,
      categoria: 'personal',
      recurso_nombre: 'Cocineros',
      origen_tipo: 'personal',
      origen_id: null,
      cantidad_requerida: 8,
      cantidad_disponible: 8,
      unidad_medida: 'personas',
      estado: 'disponible',
      estado_manual: false,
      fecha_limite: null,
      notas: 'Confirmados: 8'
    },
    {
      id: 3,
      evento_id: 201,
      categoria: 'mobiliario',
      recurso_nombre: 'Mesas de 10 puestos',
      origen_tipo: 'producto_catalogo',
      origen_id: 10,
      cantidad_requerida: 10,
      cantidad_disponible: 10,
      unidad_medida: 'unidades',
      estado: 'disponible',
      estado_manual: false,
      fecha_limite: null,
      notas: 'Totalmente cubierto con unidades propias'
    },
    {
      id: 4,
      evento_id: 201,
      categoria: 'mobiliario',
      recurso_nombre: 'Sillas Tiffany',
      origen_tipo: 'producto_catalogo',
      origen_id: 11,
      cantidad_requerida: 100,
      cantidad_disponible: 80,
      unidad_medida: 'unidades',
      estado: 'por_conseguir',
      estado_manual: false,
      fecha_limite: '2026-10-15',
      notas: '80 unidades propias disponibles · 20 unidades por alquilar'
    }
  ]).map((f) => ({ ...f }));

  const cliente = {
    query: async (sql, params) => {
      if (sql.includes('SET estado = $1') && sql.includes('estado_manual = $2')) {
        const fila = filas.find((f) => f.id === params[2] && f.evento_id === params[3]);
        if (!fila) return { rows: [] };
        fila.estado = params[0];
        fila.estado_manual = params[1];
        return { rows: [{ ...fila }] };
      }
      if (sql.includes('SET fecha_limite = $1')) {
        const fila = filas.find((f) => f.id === params[1] && f.evento_id === params[2]);
        if (!fila) return { rows: [] };
        fila.fecha_limite = params[0];
        return { rows: [{ ...fila }] };
      }
      if (sql.includes('UPDATE evento_balance_recursos') && sql.includes('recurso_nombre = $1')) {
        const fila = filas.find((f) => f.id === params[7]);
        if (fila) {
          Object.assign(fila, {
            cantidad_requerida: params[1],
            cantidad_disponible: params[2],
            estado: params[4],
            estado_manual: params[5]
          });
        }
        return { rows: [] };
      }
      if (sql.includes('FROM evento_balance_recursos r') && sql.includes('JOIN eventos')) {
        const fila = filas.find((f) => f.id === params[0] && f.evento_id === params[1]);
        return { rows: fila ? [{ id: fila.id, fecha_evento: '2026-10-20' }] : [] };
      }
      if (sql.includes('FROM eventos WHERE id')) {
        return {
          rows: [
            {
              id: 201,
              nombre_evento: 'Gala Anual',
              asistentes,
              duracion_horas: 5,
              estado: estadoEvento,
              fecha_evento: '2026-10-20'
            }
          ]
        };
      }
      if (sql.includes('INSERT INTO evento_balance_recursos')) {
        const nueva = {
          id: filas.reduce((m, f) => Math.max(m, f.id), 0) + 1,
          evento_id: params[0],
          categoria: params[1],
          recurso_nombre: params[2],
          origen_tipo: params[3],
          origen_id: params[4],
          cantidad_requerida: params[5],
          cantidad_disponible: params[6],
          unidad_medida: params[7],
          estado: params[8],
          estado_manual: false,
          fecha_limite: null,
          notas: params[9]
        };
        filas.push(nueva);
        return { rows: [nueva] };
      }
      if (sql.includes('DELETE FROM evento_balance_recursos WHERE evento_id = $1 AND id <> ALL')) {
        const conservados = new Set(params[1]);
        for (let i = filas.length - 1; i >= 0; i--) {
          if (!conservados.has(filas[i].id)) filas.splice(i, 1);
        }
        return { rows: [] };
      }
      if (sql.includes('FROM evento_personal ep')) {
        return {
          rows: personalRows || [
            { rol: 'mesero', estado_asignacion: 'confirmado', asignados: 3 },
            { rol: 'cocinero', estado_asignacion: 'confirmado', asignados: 8 }
          ]
        };
      }
      if (sql.includes('FROM requerimientos_adicionales r')) {
        return {
          rows: mobiliarioRows || [
            {
              id: 10,
              tipo: 'mobiliario',
              descripcion: 'Mesas de 10 puestos',
              cantidad: 10,
              producto_id: 10,
              es_propio: true,
              stock_propio: 10,
              unidades_propias: 10,
              unidades_alquilar: 0
            },
            {
              id: 11,
              tipo: 'mobiliario',
              descripcion: 'Sillas Tiffany',
              cantidad: 100,
              producto_id: 11,
              es_propio: true,
              stock_propio: 80,
              unidades_propias: 80,
              unidades_alquilar: 20
            }
          ]
        };
      }
      if (sql.includes('SELECT * FROM evento_balance_recursos')) {
        return { rows: filas.map((f) => ({ ...f })) };
      }
      return { rows: [] };
    },
    release: () => {}
  };

  return { cliente, filas };
};

const ejecutar = async (controlador, base, req) => {
  const original = pool.connect;
  pool.connect = async () => base.cliente;
  try {
    let status = null;
    let cuerpo = null;
    const res = {
      status: (codigo) => {
        status = codigo;
        return { json: (d) => { cuerpo = d; } };
      },
      json: (d) => {
        status = 200;
        cuerpo = d;
      }
    };
    await controlador(req, res);
    return { status, cuerpo };
  } finally {
    pool.connect = original;
  }
};

test('HU-35 / RF-44: parseOnlyMissing reconoce valores booleanos y omite por defecto', () => {
  assert.equal(parseOnlyMissing({ query: { only_missing: 'true' } }), true);
  assert.equal(parseOnlyMissing({ query: { only_missing: 'TRUE' } }), true);
  assert.equal(parseOnlyMissing({ query: { only_missing: true } }), true);
  assert.equal(parseOnlyMissing({ query: { only_missing: '1' } }), true);

  assert.equal(parseOnlyMissing({ query: { only_missing: 'false' } }), false);
  assert.equal(parseOnlyMissing({ query: { only_missing: '0' } }), false);
  assert.equal(parseOnlyMissing({ query: {} }), false);
  assert.equal(parseOnlyMissing({}), false);
});

test('HU-35 / RF-44 · Escenario 1: only_missing=true retorna únicamente recursos con déficit y omite AVAILABLE y categorías vacías', async () => {
  const base = crearBaseFalsa();
  const r = await ejecutar(obtenerBalanceEvento, base, {
    params: { eventId: 'evt-201' },
    query: { only_missing: 'true' }
  });

  assert.equal(r.status, 200);
  const { categories, recursos, recursos_por_categoria, resumen } = r.cuerpo;

  // Mesas (AVAILABLE) y Cocineros (AVAILABLE) deben estar completamente omitidos
  const items = categories.flatMap((c) => c.items);
  assert.deepEqual(items.map((i) => i.item_name), ['Meseros', 'Sillas Tiffany']);
  assert.ok(!items.some((i) => i.status === ResourceStatus.AVAILABLE), 'no debe haber ningún ítem AVAILABLE');
  assert.ok(!items.some((i) => i.item_name === 'Mesas de 10 puestos'));
  assert.ok(!items.some((i) => i.item_name === 'Cocineros'));

  // Limpieza de categorías vacías: FOOD, DRINKS, OTHER no tienen faltantes así que no aparecen
  assert.deepEqual(categories.map((c) => c.category_name), ['STAFF', 'FURNITURE']);

  // Vista UI congruente con el filtro
  assert.deepEqual(recursos.map((x) => x.recurso_nombre), ['Meseros', 'Sillas Tiffany']);
  assert.equal(recursos_por_categoria.alimento.length, 0);
  assert.equal(recursos_por_categoria.bebida.length, 0);

  // El resumen general sigue reportando el panorama completo del evento
  assert.equal(resumen.total_recursos, 4);
  assert.equal(resumen.disponibles, 2);

  // Sin only_missing=true se conserva el balance completo (4 ítems)
  const completo = await ejecutar(obtenerBalanceEvento, base, { params: { eventId: 'evt-201' }, query: {} });
  assert.equal(completo.status, 200);
  assert.equal(completo.cuerpo.recursos.length, 4);
});

test('HU-35 / RF-44 · Escenario 2: los ítems faltantes incluyen status válido y deadline_date de HU-33', () => {
  const filas = [
    {
      id: 1,
      evento_id: 201,
      categoria: 'personal',
      recurso_nombre: 'Meseros',
      cantidad_requerida: 5,
      cantidad_disponible: 3,
      unidad_medida: 'personas',
      estado: 'por_conseguir',
      fecha_limite: '2026-10-14'
    },
    {
      id: 2,
      evento_id: 201,
      categoria: 'alimento',
      recurso_nombre: 'Lomo fino',
      cantidad_requerida: 25,
      cantidad_disponible: 0,
      unidad_medida: 'kilos',
      estado: 'por_comprar',
      fecha_limite: null
    },
    {
      id: 3,
      evento_id: 201,
      categoria: 'servicio',
      recurso_nombre: 'DJ Principal',
      cantidad_requerida: 1,
      cantidad_disponible: 0,
      unidad_medida: 'servicios',
      estado: 'pendiente',
      fecha_limite: new Date(2026, 9, 15)
    },
    {
      id: 4,
      evento_id: 201,
      categoria: 'mobiliario',
      recurso_nombre: 'Mesas',
      cantidad_requerida: 10,
      cantidad_disponible: 10,
      unidad_medida: 'unidades',
      estado: 'disponible',
      fecha_limite: '2026-10-10'
    }
  ];

  const respuesta = estructurarRespuestaBalance(201, filas, { id: 201, nombre_evento: 'Gala', asistentes: 100 }, { onlyMissing: true });
  const items = respuesta.categories.flatMap((c) => c.items);

  assert.equal(items.length, 3);
  const meseros = items.find((i) => i.item_name === 'Meseros');
  const lomo = items.find((i) => i.item_name === 'Lomo fino');
  const dj = items.find((i) => i.item_name === 'DJ Principal');

  assert.deepEqual([meseros.status, meseros.deadline_date], ['TO_PROCURE', '2026-10-14']);
  assert.deepEqual([lomo.status, lomo.deadline_date], ['TO_BUY', null]);
  assert.deepEqual([dj.status, dj.deadline_date], ['PENDING', '2026-10-15']);
});

test('HU-35 / RF-44 · Escenario 3: evento con 100% de recursos AVAILABLE retorna HTTP 200 OK y categories vacío []', async () => {
  const base = crearBaseFalsa({
    asistentes: 60,
    estadoEvento: 'confirmado',
    filasIniciales: [],
    personalRows: [
      { rol: 'mesero', estado_asignacion: 'confirmado', asignados: 3 },
      { rol: 'cocinero', estado_asignacion: 'confirmado', asignados: 6 }
    ],
    mobiliarioRows: [
      {
        id: 10,
        tipo: 'mobiliario',
        descripcion: 'Mesas de 10 puestos',
        cantidad: 10,
        producto_id: 10,
        es_propio: true,
        stock_propio: 10,
        unidades_propias: 10,
        unidades_alquilar: 0
      }
    ]
  });

  const r = await ejecutar(obtenerBalanceEvento, base, {
    params: { eventId: 'evt-201' },
    query: { only_missing: 'true' }
  });

  assert.equal(r.status, 200);
  assert.deepEqual(r.cuerpo.categories, []);
  assert.deepEqual(r.cuerpo.recursos, []);
  assert.deepEqual(r.cuerpo.faltantes_anticipados, []);
  assert.equal(r.cuerpo.resumen.total_recursos, 3);
  assert.equal(r.cuerpo.resumen.disponibles, 3);
  assert.equal(r.cuerpo.resumen.porcentaje_completitud, 100);
});

test('HU-35 + HU-34 + HU-33: only_missing respeta el estado manual (AVAILABLE) y conserva la fecha límite al deshacerlo', async () => {
  const base = crearBaseFalsa();

  // Marcar manualmente Sillas Tiffany (id 4) como AVAILABLE -> debe desaparecer de only_missing=true
  const marca = await ejecutar(cambiarEstadoRecursoBalance, base, {
    params: { id: '201', recursoId: '4' },
    query: { only_missing: 'true' },
    body: { status: 'AVAILABLE' }
  });
  assert.equal(marca.status, 200);
  assert.equal(marca.cuerpo.status, 'AVAILABLE');
  assert.deepEqual(marca.cuerpo.balance.recursos.map((r) => r.recurso_nombre), ['Meseros']);
  assert.deepEqual(marca.cuerpo.balance.categories.map((c) => c.category_name), ['STAFF']);

  // Marcar también Meseros (id 1) manualmente como AVAILABLE -> categories debe quedar []
  const marcaMeseros = await ejecutar(cambiarEstadoRecursoBalance, base, {
    params: { id: '201', recursoId: '1' },
    query: { only_missing: 'true' },
    body: { status: 'AVAILABLE' }
  });
  assert.equal(marcaMeseros.status, 200);
  assert.deepEqual(marcaMeseros.cuerpo.balance.categories, []);

  // Deshacer marca manual de Sillas Tiffany con PENDING -> vuelve a faltantes con su fecha límite intacta
  const deshacer = await ejecutar(cambiarEstadoRecursoBalance, base, {
    params: { id: '201', recursoId: '4' },
    query: { only_missing: 'true' },
    body: { status: 'PENDING' }
  });
  assert.equal(deshacer.status, 200);
  const sillas = deshacer.cuerpo.balance.categories.flatMap((c) => c.items).find((i) => i.item_name === 'Sillas Tiffany');
  assert.ok(sillas, 'Sillas Tiffany debe volver a aparecer al deshacer AVAILABLE');
  assert.equal(sillas.status, 'TO_PROCURE');
  assert.equal(sillas.deadline_date, '2026-10-15');

  // Sincronizar y actualizar fecha límite con only_missing=true también conservan el filtro
  const cambioFecha = await ejecutar(establecerFechaLimiteRecurso, base, {
    params: { id: '201', recursoId: '4' },
    query: { only_missing: 'true' },
    body: { deadline_date: '2026-10-18' }
  });
  assert.equal(cambioFecha.status, 200);
  assert.deepEqual(cambioFecha.cuerpo.balance.recursos.map((r) => r.recurso_nombre), ['Sillas Tiffany']);
  assert.equal(cambioFecha.cuerpo.balance.recursos[0].fecha_limite, '2026-10-18');

  const sync = await ejecutar(sincronizarBalanceEvento, base, {
    params: { id: '201' },
    query: { only_missing: 'true' }
  });
  assert.equal(sync.status, 200);
  assert.deepEqual(sync.cuerpo.recursos.map((r) => r.recurso_nombre), ['Sillas Tiffany']);
});

test('HU-35: checklist · se puede consultar en cualquier momento antes del evento (planificación y confirmado) y la ruta del contrato existe', async () => {
  const rutas = eventosRoutes.stack
    .filter((capa) => capa.route)
    .flatMap((capa) => Object.keys(capa.route.methods).map((metodo) => `${metodo.toUpperCase()} ${capa.route.path}`));
  assert.ok(rutas.includes('GET /:eventId/logistics-balance'));
  assert.ok(rutas.includes('GET /:id/balance'));

  for (const estado of ['planificacion', 'confirmado']) {
    const base = crearBaseFalsa({ estadoEvento: estado });
    const r = await ejecutar(obtenerBalanceEvento, base, {
      params: { eventId: 'evt-201' },
      query: { only_missing: 'true' }
    });
    assert.equal(r.status, 200, `Debe permitir consultar faltantes en estado ${estado}`);
    assert.ok(r.cuerpo.categories.length > 0);
  }
});
