-- =====================================================================================================
-- QUITAR LOS DATOS DE PRUEBA (los que cargó backend/src/db/datos-de-prueba.sql)
--
-- Úsalo cuando empiecen los datos reales. Quita solo lo identificado como prueba:
--   · los eventos cuyo nombre empieza por «[Demo] » (con sus alimentos, bebidas y requerimientos);
--   · las cantidades de ejemplo del inventario (los movimientos con la nota «Datos de prueba…»): cada elemento
--     vuelve a la cantidad que tenía antes;
--   · los elementos de bebidas que creó el script (los que terminan en « (demo)»).
-- No toca los eventos ni el inventario reales. Conviene correrlo ANTES de registrar movimientos reales sobre
-- los elementos de ejemplo: si ya hubo movimientos reales encima, esos elementos se saltan y se avisa abajo.
--
-- Ejecutar en el SQL Editor de Supabase (QA y producción). Se puede repetir sin problema.
-- =====================================================================================================

BEGIN;

-- 1) Eventos de ejemplo (el borrado en cascada se lleva sus productos y requerimientos)
DELETE FROM eventos WHERE nombre_evento LIKE '[Demo] %';

-- 2) Elementos con movimientos de prueba y SIN movimientos reales después: se les restan las cantidades de
--    prueba (y lo retirado de prueba) y se borran esos movimientos
WITH prueba AS (
    SELECT producto_id,
           SUM(cantidad)                                      AS total,
           COALESCE(-SUM(cantidad) FILTER (WHERE tipo = 'baja'), 0) AS retirado
    FROM movimientos_inventario
    WHERE notas LIKE 'Datos de prueba%'
    GROUP BY producto_id
),
solo_prueba AS (
    SELECT p.* FROM prueba p
    WHERE NOT EXISTS (
        SELECT 1 FROM movimientos_inventario m
        WHERE m.producto_id = p.producto_id AND (m.notas IS NULL OR m.notas NOT LIKE 'Datos de prueba%')
          AND m.creado_en >= (SELECT MIN(creado_en) FROM movimientos_inventario x WHERE x.producto_id = p.producto_id AND x.notas LIKE 'Datos de prueba%')
    )
    AND (SELECT cantidad_propia FROM catalogo_productos c WHERE c.id = p.producto_id) - p.total >= 0
),
revertidos AS (
    UPDATE catalogo_productos c
    SET cantidad_propia = c.cantidad_propia - sp.total,
        cantidad_danada = GREATEST(c.cantidad_danada - sp.retirado, 0),
        -- la carpa del ejemplo se había marcado como alquilada: vuelve a ser propia, como en el inventario base
        es_propio = CASE WHEN c.nombre = 'Carpa' THEN true ELSE c.es_propio END
    FROM solo_prueba sp WHERE c.id = sp.producto_id
    RETURNING c.id
)
DELETE FROM movimientos_inventario m USING revertidos r
WHERE m.producto_id = r.id AND m.notas LIKE 'Datos de prueba%';

-- 3) Elementos de bebidas que creó el script (« (demo)»), si quedaron sin movimientos
DELETE FROM catalogo_productos c
WHERE c.categoria_inventario IS NOT NULL
  AND c.nombre LIKE '% (demo)'
  AND NOT EXISTS (SELECT 1 FROM movimientos_inventario m WHERE m.producto_id = c.id);

COMMIT;

-- Comprobación: no debe quedar nada de prueba. Si aparece alguna fila, ese elemento ya tenía movimientos reales
-- encima de los de prueba y se saltó: se corrige a mano desde la pantalla de inventario.
SELECT 'eventos de prueba que quedan' AS dato, COUNT(*) AS cantidad FROM eventos WHERE nombre_evento LIKE '[Demo] %'
UNION ALL SELECT 'movimientos de prueba que quedan', COUNT(*) FROM movimientos_inventario WHERE notas LIKE 'Datos de prueba%'
UNION ALL SELECT 'elementos « (demo)» que quedan', COUNT(*) FROM catalogo_productos WHERE categoria_inventario IS NOT NULL AND nombre LIKE '% (demo)';
