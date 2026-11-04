-- =====================================================================================================
-- SQL DE LA HU-28 · ASIGNAR MESEROS A UN EVENTO (RF-35) PARA QA Y PRODUCCIÓN
--
-- Se pega COMPLETO en el SQL Editor de Supabase, ANTES de desplegar el código de la HU-28, y DESPUÉS del SQL de la
-- HU-26 (docs/sql-hu-26-personal.sql), porque esta tabla apunta a la tabla `personal`. ⚠️ Sin esta tabla el detalle
-- de CUALQUIER evento da error 500 (el detalle ahora consulta los meseros asignados). Confirma antes el «Reference ID»
-- del proyecto: QA empieza por uvvluaho…, producción por geezvrmb…. Es seguro repetirlo: solo AGREGA una tabla nueva
-- y no toca nada de lo que ya hay. (Copiado de backend/src/db/schema.sql.)
-- =====================================================================================================

-- =============================================================================
-- HU-28 (RF-35): Meseros asignados a un evento. Relación muchos a muchos entre eventos y personal. Un mesero no se
-- puede asignar dos veces al mismo evento. Si un mesero se elimina después (borrado lógico, HU-27) la asignación queda
-- como historial pero ya no cuenta ni se muestra. Solo agrega una tabla nueva: no cambia ni borra nada de lo que ya hay.
-- =============================================================================
CREATE TABLE IF NOT EXISTS evento_personal (
    id SERIAL PRIMARY KEY,
    evento_id INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    personal_id INTEGER NOT NULL REFERENCES personal(id) ON DELETE RESTRICT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_evento_personal UNIQUE (evento_id, personal_id)
);
CREATE INDEX IF NOT EXISTS idx_evento_personal_evento ON evento_personal (evento_id);
CREATE INDEX IF NOT EXISTS idx_evento_personal_personal ON evento_personal (personal_id);

-- Comprobación: debe devolver 1 fila (la tabla) y 0 asignaciones en un entorno nuevo
SELECT 'tabla evento_personal' AS dato, COUNT(*)::text AS valor FROM information_schema.tables WHERE table_name = 'evento_personal'
UNION ALL SELECT 'asignaciones', COUNT(*)::text FROM evento_personal;
