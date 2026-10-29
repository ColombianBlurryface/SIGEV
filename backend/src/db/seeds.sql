-- =============================================================================
-- SIGEV: Datos Iniciales de Prueba (Seeds) - Catálogo de Productos
-- =============================================================================
-- Carga los productos base del catálogo. Se ejecuta después de schema.sql.
-- Se puede correr varias veces: el ON CONFLICT evita duplicados dentro del catálogo
-- (el nombre es único entre los productos sin categoria_inventario, ver schema.sql).
--
-- Tipos de cálculo:
--   porcion_persona    -> gramos por persona (se entrega en kg si pasa de 1000 g)
--   unidad_persona     -> unidades por persona (ej. cervezas individuales)
--   botella_compartida -> porciones por botella = volumen_botella_ml / tamano_porcion_ml
-- =============================================================================

-- QA-04 (HU-03): bebidas con las que trabaja la encargada. Primero se actualizan los productos que ya
-- existían con otro nombre (para no duplicarlos). Los precios solo se ponen en 0 si siguen siendo los
-- valores de ejemplo del seed anterior: así no se pisa un precio que ya se haya escrito desde la app.
UPDATE catalogo_productos
SET nombre = 'Club Colombia',
    precio_unitario = CASE WHEN precio_unitario = 6000 THEN 0 ELSE precio_unitario END
WHERE nombre = 'Cerveza Club Colombia 330ml' AND categoria_inventario IS NULL
  AND NOT EXISTS (SELECT 1 FROM catalogo_productos WHERE nombre = 'Club Colombia' AND categoria_inventario IS NULL);

UPDATE catalogo_productos
SET nombre = 'Vino tinto',
    tamano_porcion_ml = CASE WHEN tamano_porcion_ml = 150 THEN 125 ELSE tamano_porcion_ml END,
    precio_unitario = CASE WHEN precio_unitario = 65000 THEN 0 ELSE precio_unitario END
WHERE nombre = 'Vino Tinto Cabernet Sauvignon 750ml' AND categoria_inventario IS NULL
  AND NOT EXISTS (SELECT 1 FROM catalogo_productos WHERE nombre = 'Vino tinto' AND categoria_inventario IS NULL);

UPDATE catalogo_productos
SET nombre = 'Champaña',
    precio_unitario = CASE WHEN precio_unitario = 85000 THEN 0 ELSE precio_unitario END
WHERE nombre = 'Champaña Brut 750ml' AND categoria_inventario IS NULL
  AND NOT EXISTS (SELECT 1 FROM catalogo_productos WHERE nombre = 'Champaña' AND categoria_inventario IS NULL);

-- Licores que antes se cargaban con la presentación en el nombre («… 750ml»): se dejan con el nombre
-- simple, igual que el resto. Va antes del INSERT para que, al repetir este archivo, el INSERT no
-- vuelva a crear los nombres viejos.
UPDATE catalogo_productos SET nombre = 'Vodka Absolut'
WHERE nombre = 'Vodka Absolut 750ml' AND categoria_inventario IS NULL
  AND NOT EXISTS (SELECT 1 FROM catalogo_productos WHERE nombre = 'Vodka Absolut' AND categoria_inventario IS NULL);
UPDATE catalogo_productos SET nombre = 'Ron Viejo de Caldas'
WHERE nombre = 'Ron Viejo de Caldas 750ml' AND categoria_inventario IS NULL
  AND NOT EXISTS (SELECT 1 FROM catalogo_productos WHERE nombre = 'Ron Viejo de Caldas' AND categoria_inventario IS NULL);
UPDATE catalogo_productos SET nombre = 'Ginebra Tanqueray'
WHERE nombre = 'Ginebra Tanqueray 750ml' AND categoria_inventario IS NULL
  AND NOT EXISTS (SELECT 1 FROM catalogo_productos WHERE nombre = 'Ginebra Tanqueray' AND categoria_inventario IS NULL);
UPDATE catalogo_productos SET nombre = 'Tequila José Cuervo Especial'
WHERE nombre = 'Tequila José Cuervo Especial 750ml' AND categoria_inventario IS NULL
  AND NOT EXISTS (SELECT 1 FROM catalogo_productos WHERE nombre = 'Tequila José Cuervo Especial' AND categoria_inventario IS NULL);

INSERT INTO catalogo_productos 
(nombre, clasificacion, tipo_calculo, porcion_por_persona, unidad_medida, volumen_botella_ml, tamano_porcion_ml, precio_unitario)
VALUES
-- Alimentos
('Medallones de Lomo de Res', 'alimento', 'porcion_persona', 200, 'g', 0, 0, 45000),
('Pechuga en Salsa de Champiñones', 'alimento', 'porcion_persona', 220, 'g', 0, 0, 32000),
('Arroz Verde con Almendras', 'alimento', 'porcion_persona', 120, 'g', 0, 0, 12000),
('Ensalada César', 'alimento', 'porcion_persona', 100, 'g', 0, 0, 10000),

-- Bebidas generales individuales (HU-13, RF-17: consumo directo; QA-04): 2 unidades por persona.
-- Sin precio (0): lo escribe la encargada al registrar el evento o desde la pantalla Catálogo.
('Poker', 'bebida_general', 'unidad_persona', 2, 'unidades', 0, 0, 0),
('Club Colombia', 'bebida_general', 'unidad_persona', 2, 'unidades', 0, 0, 0),
('Águila', 'bebida_general', 'unidad_persona', 2, 'unidades', 0, 0, 0),
('Águila Light', 'bebida_general', 'unidad_persona', 2, 'unidades', 0, 0, 0),
('Costeña', 'bebida_general', 'unidad_persona', 2, 'unidades', 0, 0, 0),
('Sol', 'bebida_general', 'unidad_persona', 2, 'unidades', 0, 0, 0),
('Gaseosa individual 250ml', 'bebida_general', 'unidad_persona', 1, 'unidades', 0, 0, 3500),

-- Bebidas generales compartidas por botella (QA-04): botella de 750 ml y porción de 125 ml, sin precio.
('Vino tinto', 'bebida_general', 'botella_compartida', 0, 'botellas', 750, 125, 0),
('Vino blanco', 'bebida_general', 'botella_compartida', 0, 'botellas', 750, 125, 0),
('Vino rosado', 'bebida_general', 'botella_compartida', 0, 'botellas', 750, 125, 0),
('Champaña', 'bebida_general', 'botella_compartida', 0, 'botellas', 750, 125, 0),

-- Bar de coctelería (HU-13, RF-16): licores fuertes que se sirven por trago o como base de cócteles.
-- Se manejan aparte de las bebidas generales (RN-08). Porción de 50 ml por trago.
('Whisky 12 Años 1000ml', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 1000, 50, 160000),
('Vodka Absolut', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 95000),
('Ron Viejo de Caldas', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 70000),
('Ginebra Tanqueray', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 120000),
('Tequila José Cuervo Especial', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 110000)
ON CONFLICT (nombre) WHERE categoria_inventario IS NULL DO NOTHING;
-- 3. Criterio HU-44: Insertar los 3 cócteles de prueba obligatorios
INSERT INTO cocteles (nombre, descripcion) VALUES
('Gin Tonic', 'Cóctel a base de ginebra y agua tónica (Dato de prueba)'),
('Whisky Sour', 'Cóctel a base de whisky y limón (Dato de prueba)'),
('Mojito', 'Cóctel refrescante a base de ron blanco y hierbabuena (Dato de prueba)')
ON CONFLICT (nombre) DO NOTHING;

-- Enlazar los licores de coctelería existentes en catalogo_productos
INSERT INTO coctel_ingredientes (coctel_id, licor_id, mililitros)
SELECT c.id, p.id, 50.00
FROM cocteles c, catalogo_productos p
WHERE c.nombre = 'Gin Tonic' AND p.nombre ILIKE '%Ginebra%' AND p.clasificacion = 'bar_cocteleria'
ON CONFLICT DO NOTHING;

INSERT INTO coctel_ingredientes (coctel_id, licor_id, mililitros)
SELECT c.id, p.id, 60.00
FROM cocteles c, catalogo_productos p
WHERE c.nombre = 'Whisky Sour' AND p.nombre ILIKE '%Whisky%' AND p.clasificacion = 'bar_cocteleria'
ON CONFLICT DO NOTHING;

INSERT INTO coctel_ingredientes (coctel_id, licor_id, mililitros)
SELECT c.id, p.id, 50.00
FROM cocteles c, catalogo_productos p
WHERE c.nombre = 'Mojito' AND p.nombre ILIKE '%Ron%' AND p.clasificacion = 'bar_cocteleria'
ON CONFLICT DO NOTHING;

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
