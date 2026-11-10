-- =====================================================================================================
-- SQL DE LA HU-26 · REGISTRAR MESEROS (RF-33) PARA QA Y PRODUCCIÓN
--
-- Se pega COMPLETO en el SQL Editor de Supabase, ANTES de desplegar el código de la HU-26 (sin la tabla, la pantalla
-- «Personal» da error 500; el resto de la aplicación no se afecta). Confirma antes el «Reference ID» del proyecto:
-- QA empieza por uvvluaho…, producción por geezvrmb…. Es seguro repetirlo: solo AGREGA una tabla nueva y no toca nada
-- de lo que ya hay. (Copiado de backend/src/db/schema.sql.)
-- =====================================================================================================

-- =============================================================================
-- HU-26 (RF-33): Personal de servicio. Una sola tabla genérica con un rol (hoy solo «mesero»; mañana cocineros u
-- otros perfiles sin crear tablas nuevas). `activo` permite el borrado lógico de la HU-27 (RF-34): un mesero
-- eliminado se marca inactivo y deja de listarse y se borran sus asignaciones a eventos (RF-38: sin historial de asignaciones).
-- Solo agrega una tabla nueva: no cambia ni borra nada de lo que ya hay.
-- =============================================================================
CREATE TABLE IF NOT EXISTS personal (
    id SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    contacto VARCHAR(150) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'mesero',
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_personal_rol CHECK (rol IN ('mesero', 'cocinero')),
    CONSTRAINT chk_personal_nombre CHECK (length(btrim(nombre_completo)) > 0),
    CONSTRAINT chk_personal_contacto CHECK (length(btrim(contacto)) > 0)
);
-- No puede haber dos personas ACTIVAS iguales (mismo rol, nombre y contacto); un eliminado se puede volver a crear
CREATE UNIQUE INDEX IF NOT EXISTS uq_personal_activo ON personal (rol, lower(nombre_completo), lower(contacto)) WHERE activo;
CREATE INDEX IF NOT EXISTS idx_personal_rol_activo ON personal (rol) WHERE activo;

-- Comprobación: debe devolver 1 fila (la tabla) y 0 meseros en un entorno nuevo
SELECT 'tabla personal' AS dato, COUNT(*)::text AS valor FROM information_schema.tables WHERE table_name = 'personal'
UNION ALL SELECT 'personas registradas', COUNT(*)::text FROM personal;
