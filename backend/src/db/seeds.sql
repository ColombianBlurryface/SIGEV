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

INSERT INTO catalogo_productos 
(nombre, clasificacion, tipo_calculo, porcion_por_persona, unidad_medida, volumen_botella_ml, tamano_porcion_ml, precio_unitario)
VALUES
-- Alimentos
('Medallones de Lomo de Res', 'alimento', 'porcion_persona', 200, 'g', 0, 0, 45000),
('Pechuga en Salsa de Champiñones', 'alimento', 'porcion_persona', 220, 'g', 0, 0, 32000),
('Arroz Verde con Almendras', 'alimento', 'porcion_persona', 120, 'g', 0, 0, 12000),
('Ensalada César', 'alimento', 'porcion_persona', 100, 'g', 0, 0, 10000),

-- Bebidas generales individuales (HU-13, RF-17: consumo directo)
('Cerveza Club Colombia 330ml', 'bebida_general', 'unidad_persona', 2, 'unidades', 0, 0, 6000),
('Gaseosa individual 250ml', 'bebida_general', 'unidad_persona', 1, 'unidades', 0, 0, 3500),

-- Bebidas generales compartidas por botella
('Vino Tinto Cabernet Sauvignon 750ml', 'bebida_general', 'botella_compartida', 0, 'botellas', 750, 150, 65000),
('Champaña Brut 750ml', 'bebida_general', 'botella_compartida', 0, 'botellas', 750, 125, 85000),

-- Bar de coctelería (HU-13, RF-16): licores fuertes que se sirven por trago o como base de cócteles.
-- Se manejan aparte de las bebidas generales (RN-08). Porción de 50 ml por trago.
('Whisky 12 Años 1000ml', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 1000, 50, 160000),
('Vodka Absolut 750ml', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 95000),
('Ron Viejo de Caldas 750ml', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 70000),
('Ginebra Tanqueray 750ml', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 120000),
('Tequila José Cuervo Especial 750ml', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 750, 50, 110000)
ON CONFLICT (nombre) WHERE categoria_inventario IS NULL DO NOTHING;