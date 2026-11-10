-- =====================================================================================================
-- SQL PENDIENTE PARA QA · desde el despliegue en bb8d3f4 (actualizado el 7-nov-2026, develop en ca6b0ed)
--
-- Se pega COMPLETO en el SQL Editor de Supabase de QA (el «Reference ID» debe empezar por uvvluaho…) o se corre con
-- psql (ver abajo), ANTES de desplegar el código. NUNCA en producción sin revisar. Es seguro repetirlo: solo AGREGA
-- (una tabla, una columna opcional, otra tabla y, si falta, filas del catálogo) y no borra ni cambia nada existente.
--
-- Orden (importa: la parte 2 apunta a la tabla de la parte 1):
--   1) HU-26 · tabla `personal` (meseros)                                  — sin ella la pantalla «Personal» da 500
--   2) HU-28 · columna `eventos.hora_inicio` y tabla `evento_personal`     — sin ellas el detalle de CUALQUIER evento da 500
--   3) #60   · (opcional) cócteles ya registrados → catálogo de bebidas    — para poder elegirlos al crear un evento
--   4) HU-48 · costo de los servicios: 3 columnas y una restricción        — sin ellas guardar o abrir un evento con servicios da 500
--   (El «balance logístico» del esquema es solo diseño y todavía nada lo usa: NO se crea en QA.)
--
--   psql "$URL_DE_QA" -v ON_ERROR_STOP=1 -f qa/sql-qa-pendiente.sql
-- =====================================================================================================

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- PARTE 1 · HU-26 · PERSONAL (MESEROS)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- =====================================================================================================

-- =============================================================================
-- HU-26 (RF-33): Personal de servicio. Una sola tabla genérica con un rol (hoy solo «mesero»; mañana cocineros u
-- otros perfiles sin crear tablas nuevas). `activo` permite el borrado lógico de la HU-27 (RF-34): un mesero
-- eliminado se marca inactivo y deja de listarse, pero no se pierde el historial de los eventos donde participó.
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

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- PARTE 2 · HU-28 · HORA DE INICIO DEL EVENTO Y MESEROS ASIGNADOS
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- =====================================================================================================

-- =============================================================================
-- Hora de inicio del evento (HU-28): para saber si dos eventos se cruzan en el tiempo hace falta la hora. Columna
-- OPCIONAL: los eventos anteriores no la tienen y se tratan como ocupados todo el día. Solo agrega una columna.
-- =============================================================================
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS hora_inicio TIME;

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

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- PARTE 3 · (OPCIONAL) PR #60 · CÓCTELES YA REGISTRADOS → CATÁLOGO DE BEBIDAS
-- Los cócteles nuevos se sincronizan solos con el catálogo; los que ya existían en QA no. Esto agrega al catálogo los
-- cócteles activos que todavía no están (1 por persona, $18.000, igual que hace seeds.sql). No duplica ni pisa nada.
-- Si no quieres esos cócteles en el catálogo de QA, borra esta parte antes de correrlo.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
INSERT INTO catalogo_productos
    (nombre, clasificacion, tipo_calculo, porcion_por_persona, unidad_medida, volumen_botella_ml, tamano_porcion_ml, precio_unitario, activo)
SELECT c.nombre, 'bar_cocteleria'::clasificacion_producto_enum, 'unidad_persona'::tipo_calculo_enum, 1, 'cócteles', 0, 0, 18000, true
FROM cocteles c
WHERE c.activo = true
  AND NOT EXISTS (SELECT 1 FROM catalogo_productos cp WHERE cp.nombre = c.nombre AND cp.categoria_inventario IS NULL);

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- PARTE 4 · HU-48 · COSTO DE LOS SERVICIOS ADICIONALES (copiado de backend/src/db/schema.sql)
-- Agrega la modalidad de cobro (por servicio o por hora), el valor unitario y el costo total de cada servicio. Los
-- servicios ya guardados quedan con valores por defecto (por_servicio, 0, 0). El valor no puede ser negativo.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
ALTER TABLE requerimientos_adicionales
  ADD COLUMN IF NOT EXISTS tipo_cobro VARCHAR(20) DEFAULT 'por_servicio',
  ADD COLUMN IF NOT EXISTS valor_unitario NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costo_total NUMERIC(12, 2) DEFAULT 0;

ALTER TABLE requerimientos_adicionales DROP CONSTRAINT IF EXISTS chk_servicio_valor_positivo;
ALTER TABLE requerimientos_adicionales ADD CONSTRAINT chk_servicio_valor_positivo CHECK (tipo = 'mobiliario' OR valor_unitario >= 0);

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- COMPROBACIÓN · debe devolver 1 en las filas «tabla/columna» (personal, hora_inicio, evento_personal y las 3 columnas de la
-- HU-48 = 3) y 0 en los conteos (en QA nuevo: 0 personas, 0 asignaciones, 0 cócteles sin catálogo)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
SELECT 'tabla personal' AS dato, COUNT(*)::text AS valor FROM information_schema.tables WHERE table_name = 'personal'
UNION ALL SELECT 'columna eventos.hora_inicio', COUNT(*)::text FROM information_schema.columns WHERE table_name = 'eventos' AND column_name = 'hora_inicio'
UNION ALL SELECT 'tabla evento_personal', COUNT(*)::text FROM information_schema.tables WHERE table_name = 'evento_personal'
UNION ALL SELECT 'columnas de costo de servicios (debe ser 3)', COUNT(*)::text FROM information_schema.columns WHERE table_name = 'requerimientos_adicionales' AND column_name IN ('tipo_cobro', 'valor_unitario', 'costo_total')
UNION ALL SELECT 'personas registradas', COUNT(*)::text FROM personal
UNION ALL SELECT 'asignaciones', COUNT(*)::text FROM evento_personal
UNION ALL SELECT 'cócteles activos sin catálogo', COUNT(*)::text FROM cocteles c WHERE c.activo = true AND NOT EXISTS (SELECT 1 FROM catalogo_productos cp WHERE cp.nombre = c.nombre AND cp.categoria_inventario IS NULL);
