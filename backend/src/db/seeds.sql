-- =============================================================================
-- SIGEV: Datos Iniciales de Prueba (Seeds) - Catálogo de Productos
-- =============================================================================

INSERT INTO catalogo_productos 
(nombre, clasificacion, tipo_calculo, porcion_por_persona, unidad_medida, volumen_botella_ml, tamano_porcion_ml, precio_unitario)
VALUES
-- Alimentos
('Medallones de Lomo de Res', 'alimento', 'porcion_persona', 200, 'g', 0, 0, 45000),
('Pechuga en Salsa de Champiñones', 'alimento', 'porcion_persona', 220, 'g', 0, 0, 32000),
('Arroz Verde con Almendras', 'alimento', 'porcion_persona', 120, 'g', 0, 0, 12000),
('Ensalada César', 'alimento', 'porcion_persona', 100, 'g', 0, 0, 10000),

-- Bebidas generales individuales
('Cerveza Club Colombia 330ml', 'bebida_general', 'unidad_persona', 2, 'unidades', 0, 0, 6000),
('Gaseosa individual 250ml', 'bebida_general', 'unidad_persona', 1, 'unidades', 0, 0, 3500),

-- Bebidas compartidas por botella
('Vino Tinto Cabernet Sauvignon 750ml', 'bebida_general', 'botella_compartida', 0, 'botellas', 750, 150, 65000),
('Champaña Brut 750ml', 'bebida_general', 'botella_compartida', 0, 'botellas', 750, 125, 85000),

-- Bar y coctelería
('Whisky 12 Años 1000ml', 'bar_cocteleria', 'botella_compartida', 0, 'botellas', 1000, 50, 160000)
ON CONFLICT (nombre) DO NOTHING;