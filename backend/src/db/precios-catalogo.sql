-- =====================================================================================================
-- PRECIOS DE REFERENCIA DEL CATÁLOGO (mercado colombiano)
--
-- La carga del catálogo (carga-catalogo-mercado-colombiano.sql) deja los productos nuevos SIN precio. Este
-- script les pone un precio de referencia para poder probar costos de punta a punta.
--
-- IMPORTANTE
--   · Son PRECIOS APROXIMADOS DE REFERENCIA, estimados a mano; no salen de una cotización. Para datos reales,
--     se ajustan desde la pantalla Catálogo.
--   · Solo se le pone precio a los productos que están en 0: NUNCA pisa un precio que ya esté escrito
--     (ni los que vienen en seeds.sql ni los que se hayan editado desde la pantalla).
--   · Se puede ejecutar varias veces. Solo cambia datos (no la estructura de la base).
--
-- Unidad del precio: alimentos, por kg; bebidas por unidad (cerveza, gaseosa, agua...), por botella
-- de 750 ml (vinos, licores) o por bolsa (hielo). Valores en pesos colombianos (COP).
-- =====================================================================================================

UPDATE catalogo_productos c
SET precio_unitario = p.precio
FROM (VALUES
    -- Cervezas nacionales (330 ml)
    ('Poker',                              3200),
    ('Águila',                             3500),
    ('Águila Light',                       3500),
    ('Club Colombia',                      4200),
    ('Club Colombia Negra',                4500),
    ('Club Colombia Roja',                 4500),
    ('Costeña',                            3300),
    ('Pilsen',                             3200),
    ('Andina',                             3500),
    ('Sol',                                4500),
    ('Redd''s',                            4800),
    -- Cervezas artesanales e importadas
    ('3 Cordilleras',                      7500),
    ('Apóstol',                            8500),
    ('Bogotá Beer Company (BBC)',          8500),
    ('Budweiser',                          4500),
    ('Miller',                             4200),
    ('Corona',                             6000),
    ('Heineken',                           6500),
    ('Stella Artois',                      7000),
    -- Gaseosas, aguas, maltas y otras sin alcohol
    ('Coca-Cola',                          3200),
    ('Pepsi',                              3000),
    ('7Up',                                2800),
    ('Colombiana',                         3000),
    ('Manzana Postobón',                   2800),
    ('Uva Postobón',                       2800),
    ('Pony Malta',                         3200),
    ('Jugo Hit',                           3000),
    ('Gatorade',                           5000),
    ('Agua Brisa',                         2500),
    ('Agua Cristal',                       2500),
    ('Agua con gas',                       3000),
    -- Vinos y espumosos (botella de 750 ml)
    ('Vino tinto',                        55000),
    ('Vino blanco',                       52000),
    ('Vino rosado',                       52000),
    ('Vino Grajales',                     65000),
    ('Vino Marqués de Villa de Leyva',    68000),
    ('Espumoso Casa Grajales',            70000),
    ('Champaña',                          90000),
    -- Bar: acompañantes (por unidad; el hielo, por bolsa)
    ('Agua tónica',                        3500),
    ('Soda',                               2500),
    ('Hielo (bolsa)',                      6000),
    -- Aguardientes (botella de 750 ml)
    ('Aguardiente Amarillo de Manzanares',70000),
    ('Aguardiente Antioqueño',            68000),
    ('Aguardiente Blanco del Valle',      66000),
    ('Aguardiente Blanco del Valle sin azúcar', 68000),
    ('Aguardiente Cristal',               62000),
    ('Aguardiente Cristal sin azúcar',    64000),
    ('Aguardiente Llanero',               62000),
    ('Aguardiente Líder',                 60000),
    ('Aguardiente Néctar',                66000),
    ('Aguardiente Origen del Valle',      70000),
    ('Aguardiente Tapa Roja',             72000),
    -- Rones (botella de 750 ml)
    ('Ron Medellín',                      62000),
    ('Ron Tres Esquinas',                 65000),
    ('Ron Parce',                         68000),
    ('Ron Santa Fe',                      80000),
    ('Ron Gorgona',                       90000),
    ('Ron La Hechicera',                 190000),
    ('Ron Viejo de Caldas',               70000),
    -- Vodka, ginebra y tequila (botella de 750 ml)
    ('Vodka Smirnoff',                    75000),
    ('Vodka Smirnoff X1 Lulo',            70000),
    ('Vodka Absolut',                     95000),
    ('Ginebra Tanqueray',                120000),
    ('Ginebra Bombay Sapphire',          130000),
    ('Tequila José Cuervo Especial',     110000),
    ('Tequila Don Julio Blanco',         250000),
    -- Whisky (botella de 750 ml; el de 1000 ml ya trae su precio)
    ('Whisky Johnnie Walker Red Label',  100000),
    ('Whisky Old Parr 12 años',          190000),
    ('Whisky Johnnie Walker Black Label',190000),
    ('Whisky Buchanans 12 años',         195000),
    ('Whisky Chivas Regal 12 años',      185000),
    ('Whisky 12 Años 1000ml',            160000),
    -- Alimentos (por kg)
    ('Medallones de Lomo de Res',         45000),
    ('Pechuga en Salsa de Champiñones',   32000),
    ('Arroz Verde con Almendras',         12000),
    ('Ensalada César',                    10000),
    ('Gaseosa individual 250ml',           3500)
) AS p(nombre, precio)
WHERE c.nombre = p.nombre
  AND c.categoria_inventario IS NULL
  AND c.precio_unitario = 0;

-- Comprobación: productos activos del catálogo que siguen sin precio (lo esperado es 0, salvo los que
-- se hayan creado a mano y no estén en esta lista)
SELECT nombre, clasificacion
FROM catalogo_productos
WHERE categoria_inventario IS NULL AND activo AND precio_unitario = 0
ORDER BY clasificacion, nombre;
