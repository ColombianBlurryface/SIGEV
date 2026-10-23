-- =============================================================================
-- SIGEV: Esquema de la base de datos (PostgreSQL / Supabase)
-- =============================================================================
-- Crea los tipos y tablas del sistema. Se puede ejecutar varias veces sin error:
-- usa CREATE ... IF NOT EXISTS y ADD COLUMN IF NOT EXISTS.
--
-- Cómo aplicarlo:
--   - Supabase: pegar el archivo en el SQL Editor del proyecto y ejecutarlo.
--   - Postgres local: psql -d sigev_db -f backend/src/db/schema.sql
--
-- IMPORTANTE: cambiar este archivo NO actualiza Supabase por sí solo.
-- Quien agregue o modifique una tabla debe ejecutar el cambio en Supabase
-- en el mismo PR y avisarlo en la descripción.
-- =============================================================================

-- 1. Tipos enumerados
DO $$ BEGIN
    CREATE TYPE tipo_calculo_enum AS ENUM (
        'porcion_persona',    -- Alimentos en gramos o kilogramos
        'unidad_persona',     -- Bebidas individuales
        'botella_compartida', -- Bebidas por botella (vino, licor)
        'cantidad_fija'       -- Mobiliario o insumos fijos
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE clasificacion_producto_enum AS ENUM (
        'alimento',
        'bebida_general',
        'bar_cocteleria',
        'mobiliario'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE estado_evento_enum AS ENUM (
        'planificacion',
        'confirmado',
        'realizado',
        'cancelado'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Tabla de Eventos (RF-01, RF-02, RF-08, RN-01)
CREATE TABLE IF NOT EXISTS eventos (
    id SERIAL PRIMARY KEY,
    nombre_evento VARCHAR(150) NOT NULL,
    fecha_evento DATE NOT NULL,
    tipo_evento VARCHAR(50) NOT NULL,
    duracion_horas NUMERIC(4, 2) NOT NULL,
    asistentes INTEGER NOT NULL,
    estado estado_evento_enum NOT NULL DEFAULT 'planificacion',
    observaciones_generales TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_asistentes_rango CHECK (asistentes >= 40 AND asistentes <= 600),
    CONSTRAINT chk_duracion_positiva CHECK (duracion_horas > 0)
);
-- COR-01 (HU-01, RF-02, RN-14): Asegurar de forma repetible que la duración esté entre 3 y 8 horas
-- (por si la tabla ya existía con la restricción antigua chk_duracion_positiva)
ALTER TABLE eventos DROP CONSTRAINT IF EXISTS chk_duracion_positiva;
ALTER TABLE eventos DROP CONSTRAINT IF EXISTS chk_duracion_rango;
ALTER TABLE eventos ADD CONSTRAINT chk_duracion_rango
    CHECK (duracion_horas >= 3 AND duracion_horas <= 8);

-- 3. Catálogo de Alimentos y Bebidas Predeterminadas (RF-18, RF-19, RF-20)
CREATE TABLE IF NOT EXISTS catalogo_productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL, -- Único dentro del catálogo y dentro del inventario (ver sección 7)
    clasificacion clasificacion_producto_enum NOT NULL,
    tipo_calculo tipo_calculo_enum NOT NULL,
    porcion_por_persona NUMERIC(10, 2) DEFAULT 0,
    unidad_medida VARCHAR(30) NOT NULL,
    volumen_botella_ml NUMERIC(10, 2) DEFAULT 0,
    tamano_porcion_ml NUMERIC(10, 2) DEFAULT 0,
    precio_unitario NUMERIC(12, 2) NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT true
);

-- 4. Insumos Asignados y Calculados por Evento (RF-21 al RF-27, RN-09, RN-11)
CREATE TABLE IF NOT EXISTS evento_productos (
    id SERIAL PRIMARY KEY,
    evento_id INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES catalogo_productos(id),
    porcion_por_persona NUMERIC(10, 2) NOT NULL,
    cantidad_neta NUMERIC(10, 2) NOT NULL,
    cantidad_con_margen NUMERIC(10, 2) NOT NULL,
    unidad_entrega VARCHAR(30) NOT NULL,
    costo_estimado NUMERIC(12, 2) NOT NULL DEFAULT 0,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_evento_producto UNIQUE (evento_id, producto_id)
);

-- Componentes del menú por alimento (HU-02). ALTER para bases ya creadas.
ALTER TABLE evento_productos ADD COLUMN IF NOT EXISTS componentes_menu TEXT;

-- 5. Servicios Opcionales sin Cálculo Automático (RF-06, RF-47, RF-48)
CREATE TABLE IF NOT EXISTS requerimientos_adicionales (
    id SERIAL PRIMARY KEY,
    evento_id INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,
    descripcion TEXT NOT NULL,
    cantidad INTEGER,
    notas TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- HU-12 (RF-14): el mobiliario del evento se relaciona con un elemento del inventario.
-- Si producto_id es NULL, el elemento no está en el inventario y todo se debe alquilar.
-- ON DELETE SET NULL: si algún día se borra el elemento, el evento conserva la descripción.
ALTER TABLE requerimientos_adicionales
ADD COLUMN IF NOT EXISTS producto_id INTEGER REFERENCES catalogo_productos(id) ON DELETE SET NULL;

-- RN-18 (HU-05, RF-06): cada servicio adicional tiene sus unidades (columna cantidad, de 1 a 5) y sus horas, que no
-- pueden superar la duración del evento. Solo se agrega una columna opcional: no cambia ni borra nada de lo que ya hay.
ALTER TABLE requerimientos_adicionales ADD COLUMN IF NOT EXISTS horas NUMERIC(4, 2);

-- 6. Usuarios del sistema (login únicamente; el alta se hace con src/scripts/crearUsuario.js)
--    La contraseña se guarda como hash bcrypt, nunca en texto plano.
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(30) NOT NULL DEFAULT 'operador',
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- 7. Inventario propio: los elementos se guardan en catalogo_productos con una
--    categoria_inventario (si es NULL, el producto es de catálogo y no de inventario).
-- Extensión de tabla para cubrir HU-08, HU-09, HU-10, HU-12 y HU-13
ALTER TABLE catalogo_productos
ADD COLUMN IF NOT EXISTS categoria_inventario VARCHAR(50) CHECK (categoria_inventario IN ('Mobiliario', 'Bar/Bebidas', 'Bebidas de Coctelería', 'Vajilla')),
ADD COLUMN IF NOT EXISTS cantidad_propia INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS cantidad_danada INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS es_propio BOOLEAN DEFAULT TRUE;

-- HU-09 (RF-10): conjunto cerrado de cuatro categorías. No existe «Decoración».
-- En bases creadas antes de que existiera Vajilla se reemplaza la restricción; se puede ejecutar varias veces.
ALTER TABLE catalogo_productos DROP CONSTRAINT IF EXISTS catalogo_productos_categoria_inventario_check;
ALTER TABLE catalogo_productos ADD CONSTRAINT catalogo_productos_categoria_inventario_check
    CHECK (categoria_inventario IN ('Mobiliario', 'Bar/Bebidas', 'Bebidas de Coctelería', 'Vajilla'));

-- HU-09: el inventario se consulta muy seguido filtrando por categoría, por eso lleva índice.
-- Es parcial: solo indexa los elementos del inventario, no los productos del catálogo.
CREATE INDEX IF NOT EXISTS idx_catalogo_categoria_inventario
    ON catalogo_productos (categoria_inventario) WHERE categoria_inventario IS NOT NULL;

-- HU-13: el nombre es único dentro del catálogo y, por separado, dentro del inventario.
-- Así un producto del catálogo («Ginebra Tanqueray 750ml», para calcular eventos) y una botella
-- del inventario pueden llamarse igual. Antes el nombre era único en toda la tabla.
ALTER TABLE catalogo_productos DROP CONSTRAINT IF EXISTS catalogo_productos_nombre_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_catalogo_nombre
    ON catalogo_productos (nombre) WHERE categoria_inventario IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventario_nombre
    ON catalogo_productos (nombre) WHERE categoria_inventario IS NOT NULL;

-- 8. Movimientos del inventario (HU-09, RF-13): registro inicial, adquisiciones, ajustes manuales (HU-08)
--    y bajas por daño (HU-10, siempre en negativo).
-- La suma de los movimientos de un elemento es igual a su cantidad_propia.
-- No guarda facturas, comprobantes ni costos: fuera de alcance.
CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER NOT NULL REFERENCES catalogo_productos(id) ON DELETE RESTRICT,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('registro', 'adquisicion', 'ajuste', 'baja')),
    cantidad INTEGER NOT NULL,
    cantidad_resultante INTEGER NOT NULL CHECK (cantidad_resultante >= 0),
    notas TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_cantidad_por_tipo CHECK (
        (tipo IN ('registro', 'adquisicion') AND cantidad > 0)
        OR (tipo = 'ajuste' AND cantidad <> 0)
        OR (tipo = 'baja' AND cantidad < 0)
    )
);

-- HU-10: en bases creadas antes de existir el tipo "baja", se reemplazan las dos restricciones
-- para aceptarlo. Se puede ejecutar varias veces sin error.
ALTER TABLE movimientos_inventario DROP CONSTRAINT IF EXISTS movimientos_inventario_tipo_check;
ALTER TABLE movimientos_inventario ADD CONSTRAINT movimientos_inventario_tipo_check
    CHECK (tipo IN ('registro', 'adquisicion', 'ajuste', 'baja'));
ALTER TABLE movimientos_inventario DROP CONSTRAINT IF EXISTS chk_cantidad_por_tipo;
ALTER TABLE movimientos_inventario ADD CONSTRAINT chk_cantidad_por_tipo CHECK (
    (tipo IN ('registro', 'adquisicion') AND cantidad > 0)
    OR (tipo = 'ajuste' AND cantidad <> 0)
    OR (tipo = 'baja' AND cantidad < 0)
);
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