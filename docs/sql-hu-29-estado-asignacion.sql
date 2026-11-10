-- =====================================================================================================
-- SQL DE LA HU-29 · ESTADO DE LA ASIGNACIÓN (RF-36) PARA QA Y PRODUCCIÓN
--
-- Se pega COMPLETO en el SQL Editor de Supabase, ANTES de desplegar el código de la HU-29, y DESPUÉS del SQL de la
-- HU-28 (docs/sql-hu-28-asignacion-meseros.sql), porque agrega una columna a la tabla `evento_personal`.
-- ⚠️ Sin esta columna fallan el detalle de CUALQUIER evento (consulta el estado de cada mesero) y la alerta de personal
-- de la HU-25. Confirma antes el «Reference ID» del proyecto: QA empieza por uvvluaho…, producción por geezvrmb….
-- Es seguro repetirlo: solo AGREGA una columna con valor por defecto y su restricción; no borra ni cambia datos. Las
-- asignaciones que ya existen quedan «por_confirmar». (Copiado de backend/src/db/schema.sql.)
-- =====================================================================================================

-- Estado de cada mesero asignado a un evento (HU-29): por_confirmar (al asignar), confirmado o no_puede. Quien «no_puede»
-- no cuenta para el estándar de personal (HU-25) ni bloquea su horario en otro evento.
ALTER TABLE evento_personal ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'por_confirmar';
ALTER TABLE evento_personal DROP CONSTRAINT IF EXISTS chk_evento_personal_estado;
ALTER TABLE evento_personal ADD CONSTRAINT chk_evento_personal_estado CHECK (estado IN ('por_confirmar', 'confirmado', 'no_puede'));

-- Comprobación: debe devolver 1 fila para la columna y 1 para la restricción; las asignaciones existentes salen «por_confirmar»
SELECT 'columna evento_personal.estado' AS dato, COUNT(*)::text AS valor FROM information_schema.columns WHERE table_name = 'evento_personal' AND column_name = 'estado'
UNION ALL SELECT 'restricción chk_evento_personal_estado', COUNT(*)::text FROM pg_constraint WHERE conname = 'chk_evento_personal_estado'
UNION ALL SELECT 'asignaciones por_confirmar', COUNT(*)::text FROM evento_personal WHERE estado = 'por_confirmar';
