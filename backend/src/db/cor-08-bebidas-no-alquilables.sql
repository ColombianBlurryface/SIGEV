-- COR-08 (HU-12, RN-17): solo se alquila mobiliario y vajilla; las bebidas siempre son propias.
--
-- Desde esta corrección la aplicación ya no deja marcar una bebida como «alquilada». Si en QA o en producción
-- quedó alguna de antes, este script la revisa y la corrige. No cambia la estructura de la base: solo datos.
-- Ejecutar en el SQL Editor de Supabase, primero en QA y luego en producción. Se puede repetir sin problema.

-- 1) Revisar (solo lectura): bebidas marcadas como alquiladas
SELECT id, nombre, categoria_inventario, cantidad_propia
FROM catalogo_productos
WHERE categoria_inventario IN ('Bar/Bebidas', 'Bebidas de Coctelería')
  AND es_propio = false
ORDER BY categoria_inventario, nombre;

-- 2) Corregir: pasarlas a propias (si no hay ninguna fila arriba, no cambia nada)
UPDATE catalogo_productos
SET es_propio = true
WHERE categoria_inventario IN ('Bar/Bebidas', 'Bebidas de Coctelería')
  AND es_propio = false;
