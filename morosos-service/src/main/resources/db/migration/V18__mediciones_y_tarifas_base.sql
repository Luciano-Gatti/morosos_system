CREATE TABLE tarifa (
    id UUID PRIMARY KEY,
    codigo VARCHAR(80) NOT NULL,
    nombre VARCHAR(180) NOT NULL,
    vigente_desde DATE NOT NULL,
    vigente_hasta DATE,
    cargo_fijo NUMERIC(18,2) NOT NULL DEFAULT 0,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_by VARCHAR(120) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uk_tarifa_codigo_vigencia UNIQUE (codigo, vigente_desde),
    CONSTRAINT ck_tarifa_vigencia CHECK (vigente_hasta IS NULL OR vigente_hasta >= vigente_desde),
    CONSTRAINT ck_tarifa_cargo_fijo CHECK (cargo_fijo >= 0)
);

CREATE TABLE tarifa_tramo (
    id UUID PRIMARY KEY,
    tarifa_id UUID NOT NULL REFERENCES tarifa(id),
    orden INT NOT NULL,
    consumo_desde NUMERIC(18,3) NOT NULL,
    consumo_hasta NUMERIC(18,3),
    precio_unitario NUMERIC(18,6) NOT NULL,
    created_by VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_by VARCHAR(120) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uk_tarifa_tramo_orden UNIQUE (tarifa_id, orden),
    CONSTRAINT ck_tarifa_tramo_rango CHECK (
        consumo_desde >= 0 AND (consumo_hasta IS NULL OR consumo_hasta > consumo_desde)
    ),
    CONSTRAINT ck_tarifa_tramo_precio CHECK (precio_unitario >= 0)
);

CREATE INDEX idx_tarifa_codigo_vigencia ON tarifa (codigo, vigente_desde, vigente_hasta);
CREATE INDEX idx_tarifa_tramo_tarifa_orden ON tarifa_tramo (tarifa_id, orden);

CREATE TABLE planilla_medicion (
    id UUID PRIMARY KEY,
    referencia_externa VARCHAR(180) NOT NULL,
    distrito_id UUID REFERENCES distrito(id),
    periodo DATE NOT NULL,
    estado VARCHAR(40) NOT NULL,
    origen VARCHAR(40) NOT NULL,
    carga_id UUID REFERENCES carga_proceso(id),
    created_by VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_by VARCHAR(120) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uk_planilla_medicion_referencia UNIQUE (referencia_externa)
);

CREATE TABLE medicion_inmueble (
    id UUID PRIMARY KEY,
    planilla_id UUID NOT NULL REFERENCES planilla_medicion(id),
    inmueble_id UUID NOT NULL REFERENCES inmueble(id),
    cuenta VARCHAR(50) NOT NULL,
    medicion NUMERIC(18,3),
    consumo_real NUMERIC(18,3) NOT NULL,
    consumo_facturado NUMERIC(18,3) NOT NULL,
    created_by VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_by VARCHAR(120) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uk_medicion_planilla_inmueble UNIQUE (planilla_id, inmueble_id),
    CONSTRAINT ck_medicion_consumos CHECK (
        (medicion IS NULL OR medicion >= 0) AND consumo_real >= 0 AND consumo_facturado >= 0
    )
);

CREATE INDEX idx_planilla_medicion_periodo ON planilla_medicion (periodo, estado);
CREATE INDEX idx_medicion_inmueble_planilla_cuenta ON medicion_inmueble (planilla_id, cuenta);

ALTER TABLE inmueble
    ADD COLUMN descuento_porcentaje NUMERIC(7,4) NOT NULL DEFAULT 0,
    ADD COLUMN iva_exento BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN condicion_comercial VARCHAR(120),
    ADD COLUMN tarifa_codigo VARCHAR(80);
