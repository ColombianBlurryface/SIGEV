-- Mismo bloque que está al final de seeds.sql: sirve para cargar las recetas de ejemplo en un entorno que ya existe
-- (QA o producción) sin volver a correr todas las semillas. Pegar completo en el SQL Editor de Supabase.

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
