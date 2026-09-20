-- =============================================================================
-- SIGEV: Esquema de Base de Datos - Sprint 1
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

-- 3. Catálogo de Alimentos y Bebidas Predeterminadas (RF-18, RF-19, RF-20)
CREATE TABLE IF NOT EXISTS catalogo_productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL UNIQUE,
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