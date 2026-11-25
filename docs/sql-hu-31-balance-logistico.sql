-- =====================================================================================================
-- SQL DEL BALANCE LOGÍSTICO (HU-31, HU-33 y HU-34 · RF-39 a RF-43) PARA QA Y PRODUCCIÓN
--
-- Se pega COMPLETO en el SQL Editor de Supabase, ANTES de desplegar el código del balance logístico. Confirma antes el
-- «Reference ID» del proyecto: QA empieza por uvvluaho…, producción por geezvrmb….
-- ⚠️ Sin esto, abrir el «Balance logístico» de un evento da error 500 (la tabla no existe) y, desde la HU-31, también fallan
-- el detalle de los eventos y la asignación de meseros, porque mantienen el balance al día. Hasta ahora esta tabla NO estaba
-- en ningún SQL de entrega (el SQL de QA decía que «nada la usaba»).
-- Es seguro repetirlo: todo usa IF NOT EXISTS / «ya existe» y solo AGREGA; no borra ni cambia datos. Si la tabla ya existía
-- (por ejemplo, creada a mano) sin la columna `estado_manual`, el último paso se la agrega. Va DESPUÉS de las tablas
-- `eventos` y `eventos_*` que ya existen en ambos entornos. (Copiado de backend/src/db/schema.sql.)
--
-- Qué guarda cada fila (un recurso del balance de un evento: personal, alimento, bebida, mobiliario o servicio):
--   cantidad_requerida / cantidad_disponible  → lo que calcula el sistema (HU-31)
--   estado                                    → disponible | por_comprar | por_conseguir | pendiente (HU-32)
--   estado_manual                             → true si una persona fijó el estado a mano, p. ej. «ya está listo» (HU-34)
--   fecha_limite                              → fecha para conseguir el recurso (HU-33)
-- No hay columnas de costos, facturas ni comprobantes (RF-41, RF-43): el balance no maneja dinero.
-- =====================================================================================================

-- 1) Tipos de las categorías y de los estados
DO $$ BEGIN
    CREATE TYPE categoria_balance_enum AS ENUM (
        'personal',
        'alimento',
        'bebida',
        'mobiliario',
        'servicio'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE estado_balance_enum AS ENUM (
        'disponible',
        'por_comprar',
        'por_conseguir',
        'pendiente'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2) Tabla del balance (un renglón por recurso y evento)
CREATE TABLE IF NOT EXISTS evento_balance_recursos (
    id SERIAL PRIMARY KEY,
    evento_id INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    categoria categoria_balance_enum NOT NULL,
    recurso_nombre VARCHAR(150) NOT NULL,
    origen_tipo VARCHAR(30) CHECK (origen_tipo IN ('personal', 'producto_catalogo', 'ingrediente', 'coctel', 'servicio_adicional')),
    origen_id INTEGER,
    cantidad_requerida NUMERIC(10, 2) NOT NULL DEFAULT 0,
    cantidad_disponible NUMERIC(10, 2) NOT NULL DEFAULT 0,
    unidad_medida VARCHAR(30) NOT NULL DEFAULT 'unidades',
    estado estado_balance_enum NOT NULL DEFAULT 'pendiente',
    fecha_limite DATE,
    -- HU-34 (RF-43): true cuando una persona fijó el estado a mano (p. ej. «ya está disponible»); manda sobre el cálculo del balance
    estado_manual BOOLEAN NOT NULL DEFAULT false,
    notas TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_cantidad_requerida_positiva CHECK (cantidad_requerida >= 0),
    CONSTRAINT chk_cantidad_disponible_positiva CHECK (cantidad_disponible >= 0)
);

-- 3) Índices (los dos últimos de consulta y el único que impide repetir un recurso del mismo origen en un evento)
CREATE INDEX IF NOT EXISTS idx_evento_balance_evento ON evento_balance_recursos (evento_id);
CREATE INDEX IF NOT EXISTS idx_evento_balance_estado ON evento_balance_recursos (evento_id, estado);
CREATE INDEX IF NOT EXISTS idx_evento_balance_categoria ON evento_balance_recursos (evento_id, categoria);
CREATE UNIQUE INDEX IF NOT EXISTS uq_evento_recurso_origen
    ON evento_balance_recursos (evento_id, origen_tipo, origen_id)
    WHERE origen_tipo IS NOT NULL AND origen_id IS NOT NULL;

-- 4) Si la tabla ya existía de antes sin las columnas de las HU-33 y HU-34, se las agrega (si ya están, no hace nada)
ALTER TABLE evento_balance_recursos ADD COLUMN IF NOT EXISTS fecha_limite DATE;
ALTER TABLE evento_balance_recursos ADD COLUMN IF NOT EXISTS estado_manual BOOLEAN NOT NULL DEFAULT false;

-- Comprobación: debe devolver 1 en la tabla, 2 en los tipos, 4 en los índices y 1 en cada columna.
-- La tabla recién creada tiene 0 renglones: el balance de cada evento se arma solo al abrirlo por primera vez.
SELECT 'tabla evento_balance_recursos' AS dato, COUNT(*)::text AS valor FROM information_schema.tables WHERE table_name = 'evento_balance_recursos'
UNION ALL SELECT 'tipos categoria_balance_enum y estado_balance_enum', COUNT(*)::text FROM pg_type WHERE typname IN ('categoria_balance_enum', 'estado_balance_enum')
UNION ALL SELECT 'índices del balance', COUNT(*)::text FROM pg_indexes WHERE tablename = 'evento_balance_recursos' AND indexname IN ('idx_evento_balance_evento', 'idx_evento_balance_estado', 'idx_evento_balance_categoria', 'uq_evento_recurso_origen')
UNION ALL SELECT 'columna fecha_limite', COUNT(*)::text FROM information_schema.columns WHERE table_name = 'evento_balance_recursos' AND column_name = 'fecha_limite'
UNION ALL SELECT 'columna estado_manual', COUNT(*)::text FROM information_schema.columns WHERE table_name = 'evento_balance_recursos' AND column_name = 'estado_manual'
UNION ALL SELECT 'renglones en el balance', COUNT(*)::text FROM evento_balance_recursos;
