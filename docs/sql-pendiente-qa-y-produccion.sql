-- =====================================================================================================
-- SQL PENDIENTE PARA QA Y PRODUCCIÓN (estado al 25 de octubre de 2026, develop en 5b7b73f)
--
-- Se pega COMPLETO en el SQL Editor de Supabase, ANTES de desplegar el código. Es seguro repetirlo: todo usa
-- IF NOT EXISTS / ya existe y solo AGREGA (no borra ni cambia datos). Confirma antes el «Reference ID» del
-- proyecto: QA empieza por uvvluaho…, producción por geezvrmb….
--
-- Contiene, en orden:
--   1) RN-18  · columna de horas de los servicios (sin ella, guardar o abrir un evento con servicios da error 500)
--   2) HU-44/45 · tablas de cócteles (sin ellas, las pantallas de cócteles dan error 500; el resto sigue igual)
--   3) COR-01 · restricción de duración 3 a 8 h. Solo se aplica si NO hay eventos fuera de ese rango; si los hay,
--      avisa cuáles revisar y no cambia nada (corrígelos o bórralos si son de prueba y vuelve a correr este script).
--
-- Los datos de prueba, precios y el reinicio de QA siguen siendo opcionales y aparte: docs/despliegue-y-sql-pendiente.md
-- =====================================================================================================

-- 1) RN-18: horas de cada servicio adicional (columna opcional)
ALTER TABLE requerimientos_adicionales ADD COLUMN IF NOT EXISTS horas NUMERIC(4, 2);

-- 2) HU-44 / HU-45: cócteles (copiado de backend/src/db/schema.sql)
-- 1. Tabla de cócteles
CREATE TABLE IF NOT EXISTS cocteles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla relacional de la receta (licores y mililitros)
CREATE TABLE IF NOT EXISTS coctel_ingredientes (
    id SERIAL PRIMARY KEY,
    coctel_id INTEGER NOT NULL REFERENCES cocteles(id) ON DELETE CASCADE,
    licor_id INTEGER NOT NULL REFERENCES catalogo_productos(id) ON DELETE RESTRICT,
    mililitros NUMERIC(8, 2) NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Criterio HU-44 acotado: mayor a 0 y máximo 250 ml por cóctel
    CONSTRAINT chk_mililitros_rango CHECK (mililitros > 0 AND mililitros <= 250),
    CONSTRAINT uq_coctel_licor UNIQUE (coctel_id, licor_id)
);

-- Para bases de datos donde la tabla ya existía con la restricción anterior sin límite superior:
ALTER TABLE coctel_ingredientes DROP CONSTRAINT IF EXISTS chk_mililitros_positivos;
ALTER TABLE coctel_ingredientes DROP CONSTRAINT IF EXISTS chk_mililitros_rango;
ALTER TABLE coctel_ingredientes ADD CONSTRAINT chk_mililitros_rango 
    CHECK (mililitros > 0 AND mililitros <= 250);

CREATE INDEX IF NOT EXISTS idx_coctel_ingredientes_coctel ON coctel_ingredientes(coctel_id);
-- =============================================================================
-- HU-45 (RF-53, RN-15, RN-19): Cócteles asignados al evento
-- =============================================================================
CREATE TABLE IF NOT EXISTS evento_cocteles (
    id SERIAL PRIMARY KEY,
    evento_id INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    coctel_id INTEGER NOT NULL REFERENCES cocteles(id) ON DELETE RESTRICT,
    cocteles_por_persona INTEGER NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- RN-15: entero de 1 a 10 por persona
    CONSTRAINT chk_cocteles_persona_rango CHECK (cocteles_por_persona >= 1 AND cocteles_por_persona <= 10),
    CONSTRAINT uq_evento_coctel UNIQUE (evento_id, coctel_id)
);

CREATE INDEX IF NOT EXISTS idx_evento_cocteles_evento ON evento_cocteles(evento_id);

-- 3) COR-01: duración del evento entre 3 y 8 horas (solo si no hay eventos fuera de rango)
DO $$
DECLARE fuera integer;
BEGIN
    SELECT COUNT(*) INTO fuera FROM eventos WHERE duracion_horas < 3 OR duracion_horas > 8;
    IF fuera > 0 THEN
        RAISE NOTICE 'COR-01 NO aplicada: hay % evento(s) con duración fuera de 3 a 8 horas. Revísalos con: SELECT id, nombre_evento, duracion_horas FROM eventos WHERE duracion_horas < 3 OR duracion_horas > 8;', fuera;
    ELSE
        ALTER TABLE eventos DROP CONSTRAINT IF EXISTS chk_duracion_positiva;
        ALTER TABLE eventos DROP CONSTRAINT IF EXISTS chk_duracion_rango;
        ALTER TABLE eventos ADD CONSTRAINT chk_duracion_rango CHECK (duracion_horas >= 3 AND duracion_horas <= 8);
        RAISE NOTICE 'COR-01 aplicada.';
    END IF;
END $$;

-- Comprobación: debe devolver 5 filas con un 1 cada una: la columna horas, las 3 tablas de cócteles y la restricción de duración
SELECT 'columna horas' AS dato, COUNT(*) AS existe FROM information_schema.columns WHERE table_name = 'requerimientos_adicionales' AND column_name = 'horas'
UNION ALL SELECT 'tabla ' || table_name, COUNT(*) FROM information_schema.tables WHERE table_name IN ('cocteles', 'coctel_ingredientes', 'evento_cocteles') GROUP BY table_name
UNION ALL SELECT 'restricción chk_duracion_rango', COUNT(*) FROM pg_constraint WHERE conname = 'chk_duracion_rango';
