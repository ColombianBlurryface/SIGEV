-- =====================================================================================================
-- SQL DE LA HU-46 · RECETAS DE PLATOS (RF-54) PARA QA Y PRODUCCIÓN
--
-- Se pega COMPLETO en el SQL Editor de Supabase, ANTES de desplegar el código de la HU-46 (sin las tablas, la
-- pestaña «Recetas de Platos» da error 500; el resto de la aplicación no se afecta). Confirma antes el
-- «Reference ID» del proyecto: QA empieza por uvvluaho…, producción por geezvrmb…. Es seguro repetirlo: solo AGREGA
-- (tablas nuevas y datos de ejemplo) y no toca nada de lo que ya hay.
--
--   Parte 1 · las dos tablas nuevas (obligatoria)
--   Parte 2 · los tres platos de ejemplo con su receta, marcados como «datos de prueba» (la historia los pide para
--             la Entrega 2). Si no los quieres en producción, borra esta parte antes de correrlo.
-- =====================================================================================================

-- ---------------------------------------------------------------------------------------------------
-- PARTE 1 · TABLAS (copiado de backend/src/db/schema.sql)
-- ---------------------------------------------------------------------------------------------------
-- =============================================================================
-- HU-46 (RF-54): Recetas de los platos
--   ingredientes        el maestro: cada ingrediente y cómo se compra en el mercado (kilo, libra o arroba)
--   plato_ingredientes  la receta: qué ingredientes lleva un plato (alimento del catálogo) y cuánto consume
--                       UNA persona, con su unidad. Unidades permitidas: gramo, kilo, libra, arroba.
-- Solo agrega tablas nuevas: no cambia ni borra nada de lo que ya hay.
-- =============================================================================
CREATE TABLE IF NOT EXISTS ingredientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    unidad_compra VARCHAR(10) NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_ingrediente_unidad_compra CHECK (unidad_compra IN ('gramo', 'kilo', 'libra', 'arroba'))
);
-- Un nombre una sola vez, sin importar mayúsculas
CREATE UNIQUE INDEX IF NOT EXISTS uq_ingredientes_nombre ON ingredientes (lower(nombre));

CREATE TABLE IF NOT EXISTS plato_ingredientes (
    id SERIAL PRIMARY KEY,
    plato_id INTEGER NOT NULL REFERENCES catalogo_productos(id) ON DELETE CASCADE,
    ingrediente_id INTEGER NOT NULL REFERENCES ingredientes(id) ON DELETE RESTRICT,
    cantidad_porcion NUMERIC(10, 3) NOT NULL,
    unidad_porcion VARCHAR(10) NOT NULL,
    -- true en las recetas de ejemplo; al guardar la receta real del plato deja de ser dato de prueba
    es_dato_prueba BOOLEAN NOT NULL DEFAULT false,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_plato_ingrediente_cantidad CHECK (cantidad_porcion > 0),
    CONSTRAINT chk_plato_ingrediente_unidad CHECK (unidad_porcion IN ('gramo', 'kilo', 'libra', 'arroba')),
    CONSTRAINT uq_plato_ingrediente UNIQUE (plato_id, ingrediente_id)
);
CREATE INDEX IF NOT EXISTS idx_plato_ingredientes_plato ON plato_ingredientes(plato_id);

-- ---------------------------------------------------------------------------------------------------
-- PARTE 2 · DATOS DE PRUEBA (copiado de backend/src/db/recetas-de-prueba.sql)
-- ---------------------------------------------------------------------------------------------------
-- =============================================================================
-- HU-46 (RF-54): platos y recetas de ejemplo (DATOS DE PRUEBA para la Entrega 2)
--
-- Tres platos con su receta, marcados como datos de prueba (es_dato_prueba = true) hasta que alguien guarde la receta
-- real desde Catálogo → Recetas de platos (al guardar, dejan de ser de prueba):
--   Arroz verde con almendras: arroz 80 g (se compra por kilo), almendras 15 g (libra), cilantro 10 g (libra)
--   Pechuga a la plancha:      pechuga de pollo 200 g (kilo)
--   Papa salada:               papa 150 g (arroba)
-- Es repetible: no duplica nada y NO toca un plato que ya tenga receta. «Arroz verde con almendras» ya existe en el
-- catálogo base; los otros dos platos se crean sin precio (se escribe desde Catálogo).
-- =============================================================================
INSERT INTO catalogo_productos
    (nombre, clasificacion, tipo_calculo, porcion_por_persona, unidad_medida, volumen_botella_ml, tamano_porcion_ml, precio_unitario)
SELECT v.nombre, 'alimento'::clasificacion_producto_enum, 'porcion_persona'::tipo_calculo_enum, v.porcion, 'g', 0, 0, 0
FROM (VALUES ('Pechuga a la plancha', 200), ('Papa salada', 150)) AS v(nombre, porcion)
WHERE NOT EXISTS (
    SELECT 1 FROM catalogo_productos c WHERE c.categoria_inventario IS NULL AND lower(c.nombre) = lower(v.nombre)
);

INSERT INTO ingredientes (nombre, unidad_compra) VALUES
    ('Arroz', 'kilo'), ('Almendras', 'libra'), ('Cilantro', 'libra'), ('Pechuga de pollo', 'kilo'), ('Papa', 'arroba')
ON CONFLICT (lower(nombre)) DO NOTHING;

INSERT INTO plato_ingredientes (plato_id, ingrediente_id, cantidad_porcion, unidad_porcion, es_dato_prueba)
SELECT p.id, i.id, v.cantidad, 'gramo', true
FROM (VALUES
    ('Arroz verde con almendras', 'Arroz', 80),
    ('Arroz verde con almendras', 'Almendras', 15),
    ('Arroz verde con almendras', 'Cilantro', 10),
    ('Pechuga a la plancha', 'Pechuga de pollo', 200),
    ('Papa salada', 'Papa', 150)
) AS v(plato, ingrediente, cantidad)
JOIN catalogo_productos p ON p.categoria_inventario IS NULL AND p.clasificacion = 'alimento' AND lower(p.nombre) = lower(v.plato)
JOIN ingredientes i ON lower(i.nombre) = lower(v.ingrediente)
WHERE NOT EXISTS (SELECT 1 FROM plato_ingredientes x WHERE x.plato_id = p.id)
ON CONFLICT DO NOTHING;

-- Comprobación: debe dar 3 platos con 3, 1 y 1 ingredientes
SELECT p.nombre AS plato, COUNT(pi.id) AS ingredientes FROM catalogo_productos p JOIN plato_ingredientes pi ON pi.plato_id = p.id WHERE pi.es_dato_prueba GROUP BY p.nombre ORDER BY p.nombre;

-- Comprobación: 2 tablas y los 3 platos de ejemplo con 3, 1 y 1 ingredientes
SELECT 'tabla ' || table_name AS dato, COUNT(*)::text AS valor FROM information_schema.tables WHERE table_name IN ('ingredientes', 'plato_ingredientes') GROUP BY table_name
UNION ALL SELECT 'receta ' || p.nombre, COUNT(pi.id)::text FROM catalogo_productos p JOIN plato_ingredientes pi ON pi.plato_id = p.id WHERE pi.es_dato_prueba GROUP BY p.nombre;
