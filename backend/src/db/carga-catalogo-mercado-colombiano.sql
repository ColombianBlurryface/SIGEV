-- =============================================================================
-- SIGEV: carga del catálogo con el mercado colombiano + inventario base
-- =============================================================================
-- Se pega completo en el SQL Editor de Supabase. Se puede ejecutar varias veces: no duplica nada
-- (ON CONFLICT DO NOTHING) y no pisa precios que ya se hayan escrito desde la pantalla Catálogo.
--
-- Qué hace:
--   PARTE 1  Renombra productos que ya existían para que no queden duplicados.
--   PARTE 2  Agrega al catálogo las bebidas del mercado colombiano (71 productos), SIN precio.
--   PARTE 3  Agrega elementos base al inventario (mobiliario y vajilla) con cantidad 0.
--   PARTE 4  (opcional, comentada) Limpieza de los datos de prueba marcados con «(borrar)».
--
-- Importante:
--   * Los precios quedan en 0 («Sin precio»): los escribe la encargada en la pantalla Catálogo o al
--     registrar el evento. No se inventó ningún precio.
--   * Las presentaciones son las habituales (cerveza individual, botella de 750 ml, trago de 50 ml,
--     porción de vino de 125 ml) y las cantidades por persona son estimaciones: se ajustan desde el
--     Catálogo o directamente en el evento.
--   * El inventario queda en 0: las cantidades reales se registran con «Actualizar» o «Adquisición».
--   * Lo que no es colombiano (whisky, vodka, ginebra, tequila, algunas cervezas) está marcado
--     en el título de su sección: en Colombia casi todos esos licores son importados.
-- =============================================================================

-- =============================================================================
-- PARTE 1: renombrar lo que ya existía (para no duplicar). Solo cambia el nombre y, si el valor sigue
-- siendo el de ejemplo del seed anterior, el precio o la porción. Un precio escrito a mano se respeta.
-- =============================================================================
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

-- Licores que se cargaron con la presentación en el nombre: se dejan con el nombre simple como el resto
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

-- =============================================================================
-- PARTE 2: catálogo de bebidas del mercado colombiano (sin precio)
-- =============================================================================
-- Cervezas nacionales (individuales, 2 unidades por persona)
INSERT INTO catalogo_productos
(nombre, clasificacion, tipo_calculo, porcion_por_persona, unidad_medida, volumen_botella_ml, tamano_porcion_ml, precio_unitario)
VALUES
('Águila', 'bebida_general', 'unidad_persona', 2, 'unidades', 0, 0, 0),
('Águila Light', 'bebida_general', 'unidad_persona', 2, 'unidades', 0, 0, 0),
('Poker', 'bebida_general', 'unidad_persona', 2, 'unidades', 0, 0, 0),
('Club Colombia', 'bebida_general', 'unidad_persona', 2, 'unidades', 0, 0, 0),
('Club Colombia Roja', 'bebida_general', 'unidad_persona', 2, 'unidades', 0, 0, 0),
('Club Colombia Negra', 'bebida_general', 'unidad_persona', 2, 'unidades', 0, 0, 0),
('Costeña', 'bebida_general', 'unidad_persona', 2, 'unidades', 0, 0, 0),
('Pilsen', 'bebida_general', 'unidad_persona', 2, 'unidades', 0, 0, 0),
('Andina', 'bebida_general', 'unidad_persona', 2, 'unidades', 0, 0, 0),
('Redd''s', 'bebida_general', 'unidad_persona', 2, 'unidades', 0, 0, 0)
ON CONFLICT (nombre) WHERE categoria_inventario IS NULL DO NOTHING;

-- Cervezas importadas o de marcas internacionales que se venden en Colombia
INSERT INTO catalogo_productos
(nombre, clasificacion, tipo_calculo, porcion_por_persona, unidad_medida, volumen_botella_ml, tamano_porcion_ml, precio_unitario)
VALUES
('Sol', 'bebida_general', 'unidad_persona', 2, 'unidades', 0, 0, 0),
('Corona', 'bebida_general', 'unidad_persona', 2, 'unidades', 0, 0, 0),
('Heineken', 'bebida_general', 'unidad_persona', 2, 'unidades', 0, 0, 0),
('Budweiser', 'bebida_general', 'unidad_persona', 2, 'unidades', 0, 0, 0),
('Stella Artois', 'bebida_general', 'unidad_persona', 2, 'unidades', 0, 0, 0),
('Miller', 'bebida_general', 'unidad_persona', 2, 'unidades', 0, 0, 0)
ON CONFLICT (nombre) WHERE categoria_inventario IS NULL DO NOTHING;

-- Cervezas artesanales colombianas
INSERT INTO catalogo_productos
(nombre, clasificacion, tipo_calculo, porcion_por_persona, unidad_medida, volumen_botella_ml, tamano_porcion_ml, precio_unitario)
VALUES
('3 Cordilleras', 'bebida_general', 'unidad_persona', 2, 'unidades', 0, 0, 0),
('Apóstol', 'bebida_general', 'unidad_persona', 2, 'unidades', 0, 0, 0),
('Bogotá Beer Company (BBC)', 'bebida_general', 'unidad_persona', 2, 'unidades', 0, 0, 0)
ON CONFLICT (nombre) WHERE categoria_inventario IS NULL DO NOTHING;

-- Gaseosas, aguas, jugos y maltas (individuales, 1 unidad por persona)
INSERT INTO catalogo_productos
(nombre, clasificacion, tipo_calculo, porcion_por_persona, unidad_medida, volumen_botella_ml, tamano_porcion_ml, precio_unitario)
VALUES
('Coca-Cola', 'bebida_general', 'unidad_persona', 1, 'unidades', 0, 0, 0),
('Pepsi', 'bebida_general', 'unidad_persona', 1, 'unidades', 0, 0, 0),
('Colombiana', 'bebida_general', 'unidad_persona', 1, 'unidades', 0, 0, 0),
('Manzana Postobón', 'bebida_general', 'unidad_persona', 1, 'unidades', 0, 0, 0),
('Uva Postobón', 'bebida_general', 'unidad_persona', 1, 'unidades', 0, 0, 0),
('7Up', 'bebida_general', 'unidad_persona', 1, 'unidades', 0, 0, 0),
('Pony Malta', 'bebida_general', 'unidad_persona', 1, 'unidades', 0, 0, 0),
('Jugo Hit', 'bebida_general', 'unidad_persona', 1, 'unidades', 0, 0, 0),
('Agua Cristal', 'bebida_general', 'unidad_persona', 1, 'unidades', 0, 0, 0),
('Agua Brisa', 'bebida_general', 'unidad_persona', 1, 'unidades', 0, 0, 0),
('Agua con gas', 'bebida_general', 'unidad_persona', 1, 'unidades', 0, 0, 0),
('Gatorade', 'bebida_general', 'unidad_persona', 1, 'unidades', 0, 0, 0)
ON CONFLICT (nombre) WHERE categoria_inventario IS NULL DO NOTHING;

-- Vinos y espumosos (botella de 750 ml, porción de 125 ml)
INSERT INTO catalogo_productos
(nombre, clasificacion, tipo_calculo, porcion_por_persona, unidad_medida, volumen_botella_ml, tamano_porcion_ml, precio_unitario)
VALUES
('Vino tinto', 'bebida_general', 'botella_compartida', 0, 'botellas', 750, 125, 0),
('Vino blanco', 'bebida_general', 'botella_compartida', 0, 'botellas', 750, 125, 0),
('Vino rosado', 'bebida_general', 'botella_compartida', 0, 'botellas', 750, 125, 0),
('Champaña', 'bebida_general', 'botella_compartida', 0, 'botellas', 750, 125, 0),
('Vino Marqués de Villa de Leyva', 'bebida_general', 'botella_compartida', 0, 'botellas', 750, 125, 0),
('Vino Grajales', 'bebida_general', 'botella_compartida', 0, 'botellas', 750, 125, 0),
('Espumoso Casa Grajales', 'bebida_general', 'botella_compartida', 0, 'botellas', 750, 125, 0)
ON CONFLICT (nombre) WHERE categoria_inventario IS NULL DO NOTHING;

-- Aguardientes (botella de 750 ml, trago de 50 ml)
INSERT INTO catalogo_productos
(nombre, clasificacion, tipo_calculo, porcion_por_persona, unidad_medida, volumen_botella_ml, tamano_porcion_ml, precio_unitario)
VALUES
('Aguardiente Blanco del Valle', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 0),
('Aguardiente Blanco del Valle sin azúcar', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 0),
('Aguardiente Origen del Valle', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 0),
('Aguardiente Antioqueño', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 0),
('Aguardiente Néctar', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 0),
('Aguardiente Cristal', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 0),
('Aguardiente Cristal sin azúcar', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 0),
('Aguardiente Amarillo de Manzanares', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 0),
('Aguardiente Tapa Roja', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 0),
('Aguardiente Líder', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 0),
('Aguardiente Llanero', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 0)
ON CONFLICT (nombre) WHERE categoria_inventario IS NULL DO NOTHING;

-- Rones (botella de 750 ml, trago de 50 ml)
INSERT INTO catalogo_productos
(nombre, clasificacion, tipo_calculo, porcion_por_persona, unidad_medida, volumen_botella_ml, tamano_porcion_ml, precio_unitario)
VALUES
('Ron Viejo de Caldas', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 0),
('Ron Medellín', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 0),
('Ron Santa Fe', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 0),
('Ron Tres Esquinas', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 0),
('Ron La Hechicera', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 0),
('Ron Parce', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 0),
('Ron Gorgona', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 0)
ON CONFLICT (nombre) WHERE categoria_inventario IS NULL DO NOTHING;

-- Whisky (importados; botella de 750 ml, trago de 50 ml)
INSERT INTO catalogo_productos
(nombre, clasificacion, tipo_calculo, porcion_por_persona, unidad_medida, volumen_botella_ml, tamano_porcion_ml, precio_unitario)
VALUES
('Whisky Old Parr 12 años', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 0),
('Whisky Buchanans 12 años', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 0),
('Whisky Johnnie Walker Red Label', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 0),
('Whisky Johnnie Walker Black Label', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 0),
('Whisky Chivas Regal 12 años', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 0)
ON CONFLICT (nombre) WHERE categoria_inventario IS NULL DO NOTHING;

-- Vodka, ginebra y tequila (botella de 750 ml, trago de 50 ml)
INSERT INTO catalogo_productos
(nombre, clasificacion, tipo_calculo, porcion_por_persona, unidad_medida, volumen_botella_ml, tamano_porcion_ml, precio_unitario)
VALUES
('Vodka Smirnoff', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 0),
('Vodka Smirnoff X1 Lulo', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 0),
('Vodka Absolut', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 0),
('Ginebra Tanqueray', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 0),
('Ginebra Bombay Sapphire', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 0),
('Tequila José Cuervo Especial', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 0),
('Tequila Don Julio Blanco', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 0)
ON CONFLICT (nombre) WHERE categoria_inventario IS NULL DO NOTHING;

-- Acompañantes del bar (por persona; ajusta las cantidades según tu servicio)
INSERT INTO catalogo_productos
(nombre, clasificacion, tipo_calculo, porcion_por_persona, unidad_medida, volumen_botella_ml, tamano_porcion_ml, precio_unitario)
VALUES
('Soda', 'bar_cocteleria', 'unidad_persona', 1, 'unidades', 0, 0, 0),
('Agua tónica', 'bar_cocteleria', 'unidad_persona', 1, 'unidades', 0, 0, 0),
('Hielo (bolsa)', 'bar_cocteleria', 'unidad_persona', 0.1, 'unidades', 0, 0, 0)
ON CONFLICT (nombre) WHERE categoria_inventario IS NULL DO NOTHING;

-- =============================================================================
-- PARTE 3: inventario base (cantidad 0, propio). Las cantidades reales se registran en la aplicación.
-- =============================================================================
INSERT INTO catalogo_productos
(nombre, clasificacion, tipo_calculo, unidad_medida, categoria_inventario, cantidad_propia, es_propio)
VALUES
('Silla Tiffany', 'mobiliario', 'cantidad_fija', 'unidades', 'Mobiliario', 0, true),
('Silla Chiavari', 'mobiliario', 'cantidad_fija', 'unidades', 'Mobiliario', 0, true),
('Silla plástica', 'mobiliario', 'cantidad_fija', 'unidades', 'Mobiliario', 0, true),
('Silla de cocktail (taburete)', 'mobiliario', 'cantidad_fija', 'unidades', 'Mobiliario', 0, true),
('Mesa redonda (10 personas)', 'mobiliario', 'cantidad_fija', 'unidades', 'Mobiliario', 0, true),
('Mesa rectangular', 'mobiliario', 'cantidad_fija', 'unidades', 'Mobiliario', 0, true),
('Mesa de cóctel (alta)', 'mobiliario', 'cantidad_fija', 'unidades', 'Mobiliario', 0, true),
('Mantel blanco', 'mobiliario', 'cantidad_fija', 'unidades', 'Mobiliario', 0, true),
('Mantel de color', 'mobiliario', 'cantidad_fija', 'unidades', 'Mobiliario', 0, true),
('Camino de mesa', 'mobiliario', 'cantidad_fija', 'unidades', 'Mobiliario', 0, true),
('Funda de silla', 'mobiliario', 'cantidad_fija', 'unidades', 'Mobiliario', 0, true),
('Tarima', 'mobiliario', 'cantidad_fija', 'unidades', 'Mobiliario', 0, true),
('Carpa', 'mobiliario', 'cantidad_fija', 'unidades', 'Mobiliario', 0, true),
('Sala lounge', 'mobiliario', 'cantidad_fija', 'unidades', 'Mobiliario', 0, true),
('Barra de bar', 'mobiliario', 'cantidad_fija', 'unidades', 'Mobiliario', 0, true),
('Plato base', 'mobiliario', 'cantidad_fija', 'unidades', 'Vajilla', 0, true),
('Plato trinche', 'mobiliario', 'cantidad_fija', 'unidades', 'Vajilla', 0, true),
('Plato hondo', 'mobiliario', 'cantidad_fija', 'unidades', 'Vajilla', 0, true),
('Plato de postre', 'mobiliario', 'cantidad_fija', 'unidades', 'Vajilla', 0, true),
('Tenedor', 'mobiliario', 'cantidad_fija', 'unidades', 'Vajilla', 0, true),
('Cuchillo', 'mobiliario', 'cantidad_fija', 'unidades', 'Vajilla', 0, true),
('Cuchara', 'mobiliario', 'cantidad_fija', 'unidades', 'Vajilla', 0, true),
('Cucharilla', 'mobiliario', 'cantidad_fija', 'unidades', 'Vajilla', 0, true),
('Copa de agua', 'mobiliario', 'cantidad_fija', 'unidades', 'Vajilla', 0, true),
('Copa de vino tinto', 'mobiliario', 'cantidad_fija', 'unidades', 'Vajilla', 0, true),
('Copa de vino blanco', 'mobiliario', 'cantidad_fija', 'unidades', 'Vajilla', 0, true),
('Copa flauta (champaña)', 'mobiliario', 'cantidad_fija', 'unidades', 'Vajilla', 0, true),
('Vaso highball', 'mobiliario', 'cantidad_fija', 'unidades', 'Vajilla', 0, true),
('Vaso old fashioned', 'mobiliario', 'cantidad_fija', 'unidades', 'Vajilla', 0, true),
('Vaso de trago corto', 'mobiliario', 'cantidad_fija', 'unidades', 'Vajilla', 0, true),
('Taza de café', 'mobiliario', 'cantidad_fija', 'unidades', 'Vajilla', 0, true),
('Jarra', 'mobiliario', 'cantidad_fija', 'unidades', 'Vajilla', 0, true),
('Hielera', 'mobiliario', 'cantidad_fija', 'unidades', 'Vajilla', 0, true),
('Coctelera', 'mobiliario', 'cantidad_fija', 'unidades', 'Vajilla', 0, true)
ON CONFLICT (nombre) WHERE categoria_inventario IS NOT NULL DO NOTHING;

-- =============================================================================
-- PARTE 4 (OPCIONAL, desactivada): limpiar los datos de prueba marcados con «(borrar)».
-- Para usarla, quita los «-- » del bloque. Antes revisa que no haya nada real con ese nombre.
-- Los movimientos del inventario se borran primero porque la tabla los protege (ON DELETE RESTRICT).
-- =============================================================================
-- DELETE FROM eventos WHERE nombre_evento LIKE '%(borrar)%';
-- DELETE FROM movimientos_inventario
--   WHERE producto_id IN (SELECT id FROM catalogo_productos WHERE categoria_inventario IS NOT NULL AND nombre LIKE '%(borrar)%');
-- DELETE FROM catalogo_productos WHERE categoria_inventario IS NOT NULL AND nombre LIKE '%(borrar)%';
