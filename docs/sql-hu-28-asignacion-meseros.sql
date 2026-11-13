-- =====================================================================================================
-- SQL DE LA HU-28 · ASIGNAR MESEROS A UN EVENTO (RF-35): hora de inicio + asignaciones PARA QA Y PRODUCCIÓN
--
-- Se pega COMPLETO en el SQL Editor de Supabase, ANTES de desplegar el código de la HU-28, y DESPUÉS del SQL de la
-- HU-26 (docs/sql-hu-26-personal.sql), porque esta tabla apunta a la tabla `personal`. ⚠️ Sin esta tabla el detalle
-- de CUALQUIER evento da error 500 (el detalle ahora consulta los meseros asignados). Confirma antes el «Reference ID»
-- del proyecto: QA empieza por uvvluaho…, producción por geezvrmb…. Es seguro repetirlo: solo AGREGA una columna opcional y una tabla nueva
-- y no toca nada de lo que ya hay. (Copiado de backend/src/db/schema.sql.)
-- =====================================================================================================

-- =============================================================================
-- Hora de inicio del evento (HU-28): para saber si dos eventos se cruzan en el tiempo hace falta la hora. Columna
-- OPCIONAL: los eventos anteriores no la tienen y se tratan como ocupados todo el día. Solo agrega una columna.
-- =============================================================================
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS hora_inicio TIME;

-- =============================================================================
-- HU-28 (RF-35): Meseros asignados a un evento. Relación muchos a muchos entre eventos y personal. Un mesero no se
-- puede asignar dos veces al mismo evento. Si un mesero se elimina después (borrado lógico, HU-27) sus asignaciones se borran
-- (RF-38: la tabla no guarda historial, es la «foto» actual). Solo agrega una tabla nueva: no cambia ni borra nada de lo que ya hay.
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

-- Comprobación: debe devolver 1 fila para la columna, 1 para la tabla y 0 asignaciones en un entorno nuevo
SELECT 'columna eventos.hora_inicio' AS dato, COUNT(*)::text AS valor FROM information_schema.columns WHERE table_name = 'eventos' AND column_name = 'hora_inicio'
UNION ALL SELECT 'tabla evento_personal', COUNT(*)::text FROM information_schema.tables WHERE table_name = 'evento_personal'
UNION ALL SELECT 'asignaciones', COUNT(*)::text FROM evento_personal;
