-- =====================================================================================================
-- REINICIAR LOS DATOS DE QA (empezar de cero)           ⚠️  BORRA DATOS — SOLO PARA EL ENTORNO DE QA
--
-- Qué BORRA
--   · TODOS los eventos (con sus alimentos, bebidas y requerimientos).
--   · TODO el inventario: los elementos y todos sus movimientos.
--   · Los productos de catálogo que dejaron las pruebas automáticas (nombres con «(QA-…)» o «(borrar)»).
-- Qué CONSERVA
--   · Los usuarios (nadie pierde su acceso).
--   · El catálogo de alimentos y bebidas (se le agregan precios con backend/src/db/precios-catalogo.sql).
--
-- Tiene un candado: solo corre si existe el usuario «qa», que existe en QA y NO en producción. Aun así,
-- antes de ejecutarlo confirma en Supabase que el Reference ID del proyecto empieza por «uvvluaho».
--
-- Orden completo para empezar de cero en QA:
--   1) este script            2) backend/src/db/precios-catalogo.sql      3) backend/src/db/datos-de-prueba.sql
-- =====================================================================================================

-- 0) Antes de borrar, mira qué productos de catálogo hay además de los estándar (solo lectura). Los que
--    reconozcas como pruebas y no tengan «(QA-…)» ni «(borrar)» se borran a mano con su id.
--    SELECT id, nombre, clasificacion, precio_unitario, activo
--    FROM catalogo_productos WHERE categoria_inventario IS NULL ORDER BY clasificacion, nombre;

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM usuarios WHERE usuario = 'qa') THEN
        RAISE EXCEPTION 'No se borró nada: este script es solo para QA y en esta base no existe el usuario «qa». ¿Estás en el Supabase de producción?';
    END IF;
END $$;

-- 1) Eventos (el borrado en cascada se lleva sus alimentos, bebidas y requerimientos)
DELETE FROM eventos;

-- 2) Movimientos del inventario (van antes que los elementos, que los referencian)
DELETE FROM movimientos_inventario;

-- 3) Elementos del inventario
DELETE FROM catalogo_productos WHERE categoria_inventario IS NOT NULL;

-- 4) Productos de catálogo creados por las pruebas automáticas
DELETE FROM catalogo_productos
WHERE categoria_inventario IS NULL AND (nombre LIKE '%(QA-%' OR nombre LIKE '%(borrar)%');

COMMIT;

-- Comprobación: eventos, elementos y movimientos deben quedar en 0; usuarios y catálogo se conservan
SELECT 'eventos' AS dato, COUNT(*) AS cantidad FROM eventos
UNION ALL SELECT 'elementos de inventario', COUNT(*) FROM catalogo_productos WHERE categoria_inventario IS NOT NULL
UNION ALL SELECT 'movimientos de inventario', COUNT(*) FROM movimientos_inventario
UNION ALL SELECT 'productos del catálogo (se conservan)', COUNT(*) FROM catalogo_productos WHERE categoria_inventario IS NULL
UNION ALL SELECT 'usuarios (se conservan)', COUNT(*) FROM usuarios;
