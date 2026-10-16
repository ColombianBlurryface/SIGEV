-- =============================================================================
-- SIGEV · QA: limpieza de los datos que dejan las pruebas automáticas
-- =============================================================================
-- Úsalo SOLO en la base de QA, nunca en producción.
-- Las pruebas nombran todo lo que crean con el sufijo «(QA-xxxxx)». Esto borra únicamente eso:
-- los eventos, los elementos de inventario (con su historial) y los productos de catálogo de
-- pruebas. El catálogo, el inventario base y los usuarios no se tocan.
-- =============================================================================
BEGIN;

DELETE FROM eventos WHERE nombre_evento LIKE '%(QA-%)%';

DELETE FROM movimientos_inventario
WHERE producto_id IN (
  SELECT id FROM catalogo_productos WHERE categoria_inventario IS NOT NULL AND nombre LIKE '%(QA-%)%'
);
DELETE FROM catalogo_productos WHERE categoria_inventario IS NOT NULL AND nombre LIKE '%(QA-%)%';

-- Productos de catálogo creados por las pruebas (si alguno ya se usó en un evento no de QA, se conserva)
DELETE FROM catalogo_productos
WHERE categoria_inventario IS NULL AND nombre LIKE '%(QA-%)%'
  AND id NOT IN (SELECT producto_id FROM evento_productos);

COMMIT;

SELECT
  (SELECT count(*) FROM eventos)                                                       AS eventos,
  (SELECT count(*) FROM catalogo_productos WHERE categoria_inventario IS NOT NULL)     AS inventario,
  (SELECT count(*) FROM catalogo_productos WHERE categoria_inventario IS NULL)         AS catalogo,
  (SELECT count(*) FROM usuarios)                                                      AS usuarios;
