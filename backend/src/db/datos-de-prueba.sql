-- =====================================================================================================
-- DATOS DE PRUEBA para el entorno publicado (HU-04 · hallazgo P2 del profesor)
--
-- En la sustentación el mobiliario se vio vacío porque no había datos cargados. Este script deja
-- cada módulo con algo que mostrar: inventario de las cuatro categorías, seis eventos de ejemplo (en los
-- cuatro estados: planificación, confirmado, realizado y cancelado) con mobiliario requerido, uno de ellos
-- por encima del umbral de alquiler, y movimientos de todos los tipos.
--
-- CÓMO SE IDENTIFICAN COMO PRUEBA
--   · Eventos: el nombre empieza por «[Demo] » y las observaciones dicen «Datos de prueba».
--   · Inventario: cada cantidad de ejemplo deja un movimiento con la nota «Datos de prueba…» (se ve en el
--     historial de /inventario), y los elementos de bebidas que crea este script terminan en « (demo)».
--
-- CÓMO USARLO
--   · Ejecutar en el SQL Editor de Supabase, primero en QA y luego en producción. Solo datos: no cambia la
--     estructura de la base.
--   · Se puede ejecutar varias veces: no duplica nada y NO toca los elementos que ya tienen unidades
--     (no pisa inventario real).
--   · Para quitarlo todo cuando empiecen los datos reales: backend/src/db/datos-de-prueba-quitar.sql
--
-- Las fechas de los eventos son «hoy + N días» para que siempre salgan como próximos.
-- Los cálculos (10 % de margen, redondeos) son los mismos de backend/src/controllers/eventosController.js.
-- =====================================================================================================

BEGIN;

-- 1) Productos del catálogo que usan los eventos de ejemplo. Solo se crean si faltan: nunca se
--    cambia un producto (ni su precio) que ya exista.
INSERT INTO catalogo_productos
    (nombre, clasificacion, tipo_calculo, porcion_por_persona, unidad_medida, volumen_botella_ml, tamano_porcion_ml, precio_unitario)
SELECT v.nombre, v.clasificacion::clasificacion_producto_enum, v.tipo_calculo::tipo_calculo_enum,
       v.porcion, v.unidad, v.volumen, v.tamano, v.precio
FROM (VALUES
    ('Medallones de Lomo de Res',       'alimento',       'porcion_persona',    200, 'g',         0,   0, 45000),
    ('Arroz Verde con Almendras',       'alimento',       'porcion_persona',    120, 'g',         0,   0, 12000),
    ('Ensalada César',                  'alimento',       'porcion_persona',    100, 'g',         0,   0, 10000),
    ('Pechuga en Salsa de Champiñones', 'alimento',       'porcion_persona',    220, 'g',         0,   0, 32000),
    ('Club Colombia',                   'bebida_general', 'unidad_persona',       2, 'unidades',  0,   0,     0),
    ('Poker',                           'bebida_general', 'unidad_persona',       2, 'unidades',  0,   0,     0),
    ('Agua Cristal',                    'bebida_general', 'unidad_persona',       1, 'unidades',  0,   0,     0),
    ('Champaña',                        'bebida_general', 'botella_compartida',   0, 'botellas',750, 125,     0),
    ('Agua tónica',                     'bar_cocteleria', 'unidad_persona',       1, 'unidades',  0,   0,     0),
    ('Aguardiente Antioqueño',          'bar_cocteleria', 'botella_compartida',   0, 'botellas',750,  50,     0)
) AS v(nombre, clasificacion, tipo_calculo, porcion, unidad, volumen, tamano, precio)
WHERE NOT EXISTS (
    SELECT 1 FROM catalogo_productos c WHERE c.nombre = v.nombre AND c.categoria_inventario IS NULL
);

-- 2) Elementos del inventario de las cuatro categorías. Solo se crean los que faltan (con 0 unidades).
--    La clasificación se deduce de la categoría igual que en el backend (la vajilla se guarda como «mobiliario»).
INSERT INTO catalogo_productos
    (nombre, clasificacion, tipo_calculo, unidad_medida, categoria_inventario, cantidad_propia, es_propio)
SELECT v.nombre,
       CASE v.categoria WHEN 'Bar/Bebidas' THEN 'bebida_general' WHEN 'Bebidas de Coctelería' THEN 'bar_cocteleria' ELSE 'mobiliario' END::clasificacion_producto_enum,
       'cantidad_fija'::tipo_calculo_enum, 'unidades', v.categoria, 0, v.es_propio
FROM (VALUES
    ('Silla Tiffany',                         'Mobiliario',            true),
    ('Silla Chiavari',                        'Mobiliario',            true),
    ('Mesa redonda (10 personas)',            'Mobiliario',            true),
    ('Mesa de cóctel (alta)',                 'Mobiliario',            true),
    ('Mantel blanco',                         'Mobiliario',            true),
    ('Barra de bar',                          'Mobiliario',            true),
    ('Tarima',                                'Mobiliario',            true),
    ('Carpa',                                 'Mobiliario',            false),
    ('Plato base',                            'Vajilla',               true),
    ('Plato trinche',                         'Vajilla',               true),
    ('Copa de vino tinto',                    'Vajilla',               true),
    ('Copa flauta (champaña)',                'Vajilla',               true),
    ('Vaso highball',                         'Vajilla',               true),
    ('Cuchillo',                              'Vajilla',               true),
    ('Tenedor',                               'Vajilla',               true),
    ('Agua Cristal 600 ml (demo)',            'Bar/Bebidas',           true),
    ('Cerveza Club Colombia 330 ml (demo)',   'Bar/Bebidas',           true),
    ('Gaseosa 250 ml (demo)',                 'Bar/Bebidas',           true),
    ('Aguardiente Antioqueño 750 ml (demo)',  'Bebidas de Coctelería', true),
    ('Ron Medellín 750 ml (demo)',            'Bebidas de Coctelería', true)
) AS v(nombre, categoria, es_propio)
WHERE NOT EXISTS (
    SELECT 1 FROM catalogo_productos c WHERE c.nombre = v.nombre AND c.categoria_inventario IS NOT NULL
);

-- 3) Cantidades de ejemplo. Solo a los elementos que están en 0 y que aún no tienen movimientos de prueba:
--    un elemento con unidades reales no se toca. Cada cantidad deja un movimiento «Datos de prueba».
WITH aplicar AS (
    SELECT c.id, v.cantidad
    FROM (VALUES
        ('Silla Tiffany',                        'Mobiliario',            150),
        ('Silla Chiavari',                       'Mobiliario',             80),
        ('Mesa redonda (10 personas)',           'Mobiliario',             20),
        ('Mesa de cóctel (alta)',                'Mobiliario',             12),
        ('Mantel blanco',                        'Mobiliario',             40),
        ('Barra de bar',                         'Mobiliario',              3),
        ('Tarima',                               'Mobiliario',              2),
        ('Carpa',                                'Mobiliario',              1),
        ('Plato base',                           'Vajilla',               220),
        ('Plato trinche',                        'Vajilla',               220),
        ('Copa de vino tinto',                   'Vajilla',               300),
        ('Copa flauta (champaña)',               'Vajilla',               180),
        ('Vaso highball',                        'Vajilla',               160),
        ('Cuchillo',                             'Vajilla',               240),
        ('Tenedor',                              'Vajilla',               240),
        ('Agua Cristal 600 ml (demo)',           'Bar/Bebidas',           240),
        ('Cerveza Club Colombia 330 ml (demo)',  'Bar/Bebidas',           600),
        ('Gaseosa 250 ml (demo)',                'Bar/Bebidas',           300),
        ('Aguardiente Antioqueño 750 ml (demo)', 'Bebidas de Coctelería',  60),
        ('Ron Medellín 750 ml (demo)',           'Bebidas de Coctelería',  36)
    ) AS v(nombre, categoria, cantidad)
    JOIN catalogo_productos c ON c.nombre = v.nombre AND c.categoria_inventario = v.categoria
    WHERE c.cantidad_propia = 0
      AND NOT EXISTS (SELECT 1 FROM movimientos_inventario m WHERE m.producto_id = c.id AND m.notas LIKE 'Datos de prueba%')
),
actualizado AS (
    UPDATE catalogo_productos c SET cantidad_propia = a.cantidad
    FROM aplicar a WHERE c.id = a.id
    RETURNING c.id, c.cantidad_propia
)
INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, cantidad_resultante, notas)
SELECT id, 'ajuste', cantidad_propia, cantidad_propia, 'Datos de prueba: inventario inicial de ejemplo'
FROM actualizado;

-- 4) Una adquisición y un retiro de ejemplo (para que el historial tenga movimientos de cada tipo).
--    Son dos pasos separados porque Postgres no deja actualizar la misma fila dos veces en una sola sentencia.
--    4a) Adquisición de 30 sillas, solo si la silla quedó con los datos de prueba y aún no la tiene.
WITH silla AS (
    SELECT c.id FROM catalogo_productos c
    WHERE c.nombre = 'Silla Tiffany' AND c.categoria_inventario = 'Mobiliario'
      AND EXISTS (SELECT 1 FROM movimientos_inventario m WHERE m.producto_id = c.id AND m.notas = 'Datos de prueba: inventario inicial de ejemplo')
      AND NOT EXISTS (SELECT 1 FROM movimientos_inventario m WHERE m.producto_id = c.id AND m.notas = 'Datos de prueba: adquisición de ejemplo')
),
adquirida AS (
    UPDATE catalogo_productos c SET cantidad_propia = c.cantidad_propia + 30 FROM silla s WHERE c.id = s.id
    RETURNING c.id, c.cantidad_propia
)
INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, cantidad_resultante, notas)
SELECT id, 'adquisicion', 30, cantidad_propia, 'Datos de prueba: adquisición de ejemplo' FROM adquirida;

--    4b) Retiro de 6 sillas (rotura), solo si ya tiene la adquisición de prueba y aún no el retiro.
WITH silla AS (
    SELECT c.id FROM catalogo_productos c
    WHERE c.nombre = 'Silla Tiffany' AND c.categoria_inventario = 'Mobiliario'
      AND EXISTS (SELECT 1 FROM movimientos_inventario m WHERE m.producto_id = c.id AND m.notas = 'Datos de prueba: adquisición de ejemplo')
      AND NOT EXISTS (SELECT 1 FROM movimientos_inventario m WHERE m.producto_id = c.id AND m.notas = 'Datos de prueba: retiro de ejemplo (rotura)')
),
retirada AS (
    UPDATE catalogo_productos c SET cantidad_propia = c.cantidad_propia - 6, cantidad_danada = c.cantidad_danada + 6
    FROM silla s WHERE c.id = s.id
    RETURNING c.id, c.cantidad_propia
)
INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, cantidad_resultante, notas)
SELECT id, 'baja', -6, cantidad_propia, 'Datos de prueba: retiro de ejemplo (rotura)' FROM retirada;

-- 5) Eventos de ejemplo
INSERT INTO eventos (nombre_evento, fecha_evento, tipo_evento, duracion_horas, asistentes, estado, observaciones_generales)
SELECT v.nombre, CURRENT_DATE + v.dias, v.tipo, v.horas, v.asistentes, v.estado::estado_evento_enum, v.observaciones
FROM (VALUES
    ('[Demo] Boda Martínez & Gómez',        30, 'Boda',        6, 250, 'planificacion', 'Datos de prueba. Ceremonia y recepción en el mismo salón. Menú sin mariscos. Supera el umbral de alquiler.'),
    ('[Demo] Congreso Médico Andino',       45, 'Corporativo', 8, 480, 'confirmado',    'Datos de prueba. Más de 300 asistentes: modalidad buffet.'),
    ('[Demo] Quince años de Valentina',     60, 'Quinceañero', 7, 120, 'planificacion', 'Datos de prueba. Vals a las 9 pm.'),
    ('[Demo] Cena de gala Fundación Luz',   75, 'Gala',        4,  90, 'planificacion', 'Datos de prueba. Cena servida; el mobiliario alcanza con el inventario propio.'),
    ('[Demo] Cumpleaños de Camila',        -20, 'Cumpleaños', 5,  80, 'realizado',     'Datos de prueba. Evento ya realizado (para probar el filtro de estado).'),
    ('[Demo] Reunión de directivos',        20, 'Corporativo',3,  45, 'cancelado',     'Datos de prueba. Evento cancelado (para probar el filtro de estado).')
) AS v(nombre, dias, tipo, horas, asistentes, estado, observaciones)
WHERE NOT EXISTS (SELECT 1 FROM eventos e WHERE e.nombre_evento = v.nombre);

-- 6) Alimentos y bebidas de cada evento, con las mismas fórmulas del backend:
--      · por porción (gramos): asistentes × porción; desde 1.000 g se pasa a kg; +10 % con 2 decimales
--      · por unidad: asistentes × unidades por persona; +10 % redondeado hacia arriba
--      · por botella compartida: asistentes ÷ (botella ÷ porción); +10 % redondeado hacia arriba
--    El valor unitario es el del catálogo si ya tiene precio; si no, el que va escrito aquí (como al escribirlo
--    en el registro del evento). El costo es la cantidad con margen × valor unitario.
INSERT INTO evento_productos
    (evento_id, producto_id, porcion_por_persona, cantidad_neta, cantidad_con_margen, unidad_entrega, costo_estimado, componentes_menu)
SELECT e.id, c.id, p.porcion, n.neto, m.con_margen, n.unidad, m.con_margen * COALESCE(NULLIF(c.precio_unitario, 0), v.precio), v.componentes
FROM (VALUES
    ('[Demo] Boda Martínez & Gómez',      'Medallones de Lomo de Res',       45000, 'Salsa de vino tinto, puré rústico'),
    ('[Demo] Boda Martínez & Gómez',      'Arroz Verde con Almendras',       12000, NULL),
    ('[Demo] Boda Martínez & Gómez',      'Ensalada César',                  10000, 'Crutones, parmesano'),
    ('[Demo] Boda Martínez & Gómez',      'Club Colombia',                    3200, NULL),
    ('[Demo] Boda Martínez & Gómez',      'Agua Cristal',                     2000, NULL),
    ('[Demo] Boda Martínez & Gómez',      'Champaña',                        85000, NULL),
    ('[Demo] Boda Martínez & Gómez',      'Agua tónica',                      4500, NULL),
    ('[Demo] Boda Martínez & Gómez',      'Aguardiente Antioqueño',          62000, NULL),
    ('[Demo] Congreso Médico Andino',     'Pechuga en Salsa de Champiñones', 32000, 'Puré de papa, vegetales salteados'),
    ('[Demo] Congreso Médico Andino',     'Arroz Verde con Almendras',       12000, NULL),
    ('[Demo] Congreso Médico Andino',     'Ensalada César',                  10000, NULL),
    ('[Demo] Congreso Médico Andino',     'Agua Cristal',                     2000, NULL),
    ('[Demo] Congreso Médico Andino',     'Club Colombia',                    3200, NULL),
    ('[Demo] Quince años de Valentina',   'Medallones de Lomo de Res',       45000, 'Salsa de champiñones'),
    ('[Demo] Quince años de Valentina',   'Ensalada César',                  10000, NULL),
    ('[Demo] Quince años de Valentina',   'Agua Cristal',                     2000, NULL),
    ('[Demo] Quince años de Valentina',   'Champaña',                        85000, NULL),
    ('[Demo] Cena de gala Fundación Luz', 'Medallones de Lomo de Res',       45000, 'Maridaje con vino tinto'),
    ('[Demo] Cena de gala Fundación Luz', 'Pechuga en Salsa de Champiñones', 32000, NULL),
    ('[Demo] Cena de gala Fundación Luz', 'Champaña',                        85000, NULL),
    ('[Demo] Cumpleaños de Camila',       'Pechuga en Salsa de Champiñones', 32000, 'Papas al romero'),
    ('[Demo] Cumpleaños de Camila',       'Ensalada César',                  10000, NULL),
    ('[Demo] Cumpleaños de Camila',       'Poker',                            3200, NULL),
    ('[Demo] Cumpleaños de Camila',       'Agua Cristal',                     2500, NULL),
    ('[Demo] Reunión de directivos',      'Arroz Verde con Almendras',       12000, NULL),
    ('[Demo] Reunión de directivos',      'Agua Cristal',                     2500, NULL)
) AS v(evento, producto, precio, componentes)
JOIN eventos e ON e.nombre_evento = v.evento
JOIN catalogo_productos c ON c.nombre = v.producto AND c.categoria_inventario IS NULL
CROSS JOIN LATERAL (SELECT c.porcion_por_persona AS porcion) p
CROSS JOIN LATERAL (
    SELECT CASE WHEN c.tipo_calculo = 'botella_compartida'
                THEN e.asistentes / (c.volumen_botella_ml / c.tamano_porcion_ml)
                ELSE e.asistentes * p.porcion END AS bruto
) b
CROSS JOIN LATERAL (
    SELECT CASE WHEN c.tipo_calculo = 'porcion_persona' AND b.bruto >= 1000 THEN b.bruto / 1000 ELSE b.bruto END AS neto,
           CASE WHEN c.tipo_calculo = 'porcion_persona' THEN (CASE WHEN b.bruto >= 1000 THEN 'kg' ELSE 'g' END)
                WHEN c.tipo_calculo = 'botella_compartida' THEN 'botellas'
                ELSE c.unidad_medida END AS unidad
) n
CROSS JOIN LATERAL (
    SELECT CASE WHEN c.tipo_calculo = 'porcion_persona' THEN ROUND(n.neto * 1.10, 2)
                ELSE CEIL(ROUND(n.neto * 1.10, 6)) END AS con_margen
) m
ON CONFLICT (evento_id, producto_id) DO NOTHING;

-- 7) Mobiliario (elegido del inventario; lo que no alcanza se alquila) y servicios adicionales de cada evento
INSERT INTO requerimientos_adicionales (evento_id, tipo, descripcion, cantidad, notas, producto_id)
SELECT e.id, v.tipo, COALESCE(c.nombre, v.descripcion), v.cantidad, v.notas, c.id
FROM (VALUES
    ('[Demo] Boda Martínez & Gómez',      'mobiliario', 'Silla Tiffany',              NULL,                          250, 'Doradas'),
    ('[Demo] Boda Martínez & Gómez',      'mobiliario', 'Mesa redonda (10 personas)', NULL,                           25, 'Mantel blanco'),
    ('[Demo] Boda Martínez & Gómez',      'mobiliario', 'Carpa',                      NULL,                            1, 'Terraza'),
    ('[Demo] Boda Martínez & Gómez',      'mobiliario', 'Barra de bar',               NULL,                            2, NULL),
    ('[Demo] Boda Martínez & Gómez',      'dj',         NULL,                         'DJ para recepción y fiesta',    6, 'Incluye luces básicas'),
    ('[Demo] Congreso Médico Andino',     'mobiliario', 'Silla Chiavari',             NULL,                           80, NULL),
    ('[Demo] Congreso Médico Andino',     'mobiliario', 'Tarima',                     NULL,                            2, 'Escenario principal'),
    ('[Demo] Congreso Médico Andino',     'mobiliario', NULL,                         'Pantalla LED 3 x 2 m',          1, 'Del proveedor'),
    ('[Demo] Quince años de Valentina',   'mobiliario', 'Silla Tiffany',              NULL,                          120, NULL),
    ('[Demo] Quince años de Valentina',   'mobiliario', 'Mesa de cóctel (alta)',      NULL,                           10, NULL),
    ('[Demo] Quince años de Valentina',   'dj',         NULL,                         'DJ y animación',                5, NULL),
    ('[Demo] Cena de gala Fundación Luz', 'mobiliario', 'Silla Tiffany',              NULL,                           90, NULL),
    ('[Demo] Cena de gala Fundación Luz', 'mobiliario', 'Mesa redonda (10 personas)', NULL,                            9, NULL),
    ('[Demo] Cumpleaños de Camila',       'mobiliario', 'Silla Chiavari',             NULL,                           80, NULL),
    ('[Demo] Cumpleaños de Camila',       'mobiliario', 'Mesa de cóctel (alta)',      NULL,                            6, NULL),
    ('[Demo] Reunión de directivos',      'mobiliario', 'Silla Chiavari',             NULL,                           45, NULL)
) AS v(evento, tipo, elemento, descripcion, cantidad, notas)
JOIN eventos e ON e.nombre_evento = v.evento
LEFT JOIN catalogo_productos c ON c.nombre = v.elemento AND c.categoria_inventario = 'Mobiliario'
WHERE NOT EXISTS (
    SELECT 1 FROM requerimientos_adicionales r
    WHERE r.evento_id = e.id AND r.tipo = v.tipo AND r.descripcion = COALESCE(c.nombre, v.descripcion)
);

COMMIT;

-- Comprobación rápida: cuántos datos quedaron (debe haber algo en cada módulo)
SELECT 'eventos de prueba'                    AS dato, COUNT(*) AS cantidad FROM eventos WHERE nombre_evento LIKE '[Demo] %'
UNION ALL SELECT 'productos del catálogo',        COUNT(*) FROM catalogo_productos WHERE categoria_inventario IS NULL AND activo
UNION ALL SELECT 'elementos de inventario (4 categorías: ' || COUNT(DISTINCT categoria_inventario) || ')', COUNT(*) FROM catalogo_productos WHERE categoria_inventario IS NOT NULL
UNION ALL SELECT 'movimientos de prueba',        COUNT(*) FROM movimientos_inventario WHERE notas LIKE 'Datos de prueba%'
UNION ALL SELECT 'mobiliario requerido en eventos de prueba', COUNT(*) FROM requerimientos_adicionales r JOIN eventos e ON e.id = r.evento_id WHERE e.nombre_evento LIKE '[Demo] %' AND r.tipo = 'mobiliario';
