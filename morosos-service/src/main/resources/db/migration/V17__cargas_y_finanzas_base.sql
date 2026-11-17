CREATE TABLE carga_proceso (
    id UUID PRIMARY KEY,
    tipo VARCHAR(40) NOT NULL,
    origen VARCHAR(40) NOT NULL,
    sistema_origen VARCHAR(120),
    periodo_referencia DATE,
    estado VARCHAR(40) NOT NULL,
    archivo_nombre VARCHAR(255),
    procesados INT NOT NULL DEFAULT 0,
    creados INT NOT NULL DEFAULT 0,
    actualizados INT NOT NULL DEFAULT 0,
    sin_cambios INT NOT NULL DEFAULT 0,
    ignorados INT NOT NULL DEFAULT 0,
    conflictos INT NOT NULL DEFAULT 0,
    errores INT NOT NULL DEFAULT 0,
    no_encontrados INT NOT NULL DEFAULT 0,
    monto_total NUMERIC(18,2) NOT NULL DEFAULT 0,
    iniciado_at TIMESTAMPTZ NOT NULL,
    finalizado_at TIMESTAMPTZ,
    created_by VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_by VARCHAR(120) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_carga_proceso_tipo CHECK (tipo IN (
        'INMUEBLES','DEUDA','CONCEPTOS_ADEUDADOS','FACTURACION','PAGOS','MEDICIONES'
    )),
    CONSTRAINT ck_carga_proceso_origen CHECK (origen IN (
        'EXCEL','CSV','API','MANUAL','SISTEMA_EXTERNO'
    )),
    CONSTRAINT ck_carga_proceso_estado CHECK (estado IN (
        'PENDIENTE','PROCESANDO','COMPLETADA','COMPLETADA_CON_INCIDENCIAS','FALLIDA'
    ))
);

CREATE INDEX idx_carga_proceso_tipo_fecha ON carga_proceso(tipo, created_at DESC);
CREATE INDEX idx_carga_proceso_estado ON carga_proceso(estado);

CREATE TABLE carga_incidencia (
    id UUID PRIMARY KEY,
    carga_id UUID NOT NULL REFERENCES carga_proceso(id),
    fila INT,
    cuenta VARCHAR(50),
    resultado VARCHAR(30) NOT NULL,
    codigo VARCHAR(80) NOT NULL,
    mensaje VARCHAR(1000) NOT NULL,
    payload JSONB,
    created_by VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_carga_incidencia_resultado CHECK (resultado IN (
        'IGNORADO','CONFLICTO','ERROR','NO_ENCONTRADO','ADVERTENCIA'
    ))
);

CREATE INDEX idx_carga_incidencia_carga ON carga_incidencia(carga_id);
CREATE INDEX idx_carga_incidencia_cuenta ON carga_incidencia(cuenta);

CREATE TABLE facturacion (
    id UUID PRIMARY KEY,
    inmueble_id UUID NOT NULL REFERENCES inmueble(id),
    cuenta VARCHAR(50) NOT NULL,
    titular_snapshot VARCHAR(250),
    condicion_iva VARCHAR(100),
    periodo_facturado DATE NOT NULL,
    periodo_cobro DATE,
    fecha_emision DATE,
    fecha_vencimiento DATE,
    total_neto_sin_iva NUMERIC(18,2) NOT NULL,
    total_iva NUMERIC(18,2) NOT NULL,
    total_facturado NUMERIC(18,2) NOT NULL,
    origen VARCHAR(40) NOT NULL,
    referencia_externa VARCHAR(180),
    carga_id UUID REFERENCES carga_proceso(id),
    distrito_id_snapshot UUID,
    distrito_nombre_snapshot VARCHAR(150),
    grupo_id_snapshot UUID,
    grupo_nombre_snapshot VARCHAR(150),
    version BIGINT NOT NULL DEFAULT 0,
    created_by VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_by VARCHAR(120) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uk_facturacion_inmueble_periodo UNIQUE (inmueble_id, periodo_facturado),
    CONSTRAINT ck_facturacion_importes CHECK (
        total_neto_sin_iva >= 0 AND total_iva >= 0 AND total_facturado >= 0
    )
);

CREATE INDEX idx_facturacion_periodo ON facturacion(periodo_facturado);
CREATE INDEX idx_facturacion_distrito_periodo ON facturacion(distrito_id_snapshot, periodo_facturado);
CREATE INDEX idx_facturacion_grupo_periodo ON facturacion(grupo_id_snapshot, periodo_facturado);

CREATE TABLE pago (
    id UUID PRIMARY KEY,
    inmueble_id UUID NOT NULL REFERENCES inmueble(id),
    cuenta VARCHAR(50) NOT NULL,
    fecha_pago DATE NOT NULL,
    periodo_recaudacion DATE NOT NULL,
    numero_recibo VARCHAR(100),
    metodo_pago VARCHAR(50) NOT NULL,
    estado_pago VARCHAR(30) NOT NULL,
    estado_recibo VARCHAR(60),
    usuario_paga VARCHAR(250),
    usuario_caja VARCHAR(150),
    estado_caja VARCHAR(60),
    monto_total NUMERIC(18,2) NOT NULL,
    origen VARCHAR(40) NOT NULL,
    referencia_externa VARCHAR(180),
    fingerprint VARCHAR(64) NOT NULL,
    carga_id UUID REFERENCES carga_proceso(id),
    distrito_id_snapshot UUID,
    distrito_nombre_snapshot VARCHAR(150),
    grupo_id_snapshot UUID,
    grupo_nombre_snapshot VARCHAR(150),
    titular_snapshot VARCHAR(250),
    created_by VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_by VARCHAR(120) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_pago_estado CHECK (estado_pago IN ('COMPLETADO')),
    CONSTRAINT ck_pago_monto CHECK (monto_total > 0)
);

CREATE UNIQUE INDEX uk_pago_numero_recibo
    ON pago(numero_recibo) WHERE numero_recibo IS NOT NULL;
CREATE UNIQUE INDEX uk_pago_origen_referencia
    ON pago(origen, referencia_externa) WHERE referencia_externa IS NOT NULL;
CREATE UNIQUE INDEX uk_pago_fingerprint ON pago(fingerprint);
CREATE INDEX idx_pago_fecha ON pago(fecha_pago);
CREATE INDEX idx_pago_periodo_recaudacion ON pago(periodo_recaudacion);

CREATE TABLE pago_concepto (
    id UUID PRIMARY KEY,
    pago_id UUID NOT NULL REFERENCES pago(id),
    detalle_original VARCHAR(500) NOT NULL,
    detalle_normalizado VARCHAR(500) NOT NULL,
    periodo_concepto DATE,
    fecha_vencimiento DATE,
    importe NUMERIC(18,2) NOT NULL,
    concepto_tipo VARCHAR(40) NOT NULL,
    numero_cuota INT,
    fingerprint VARCHAR(64) NOT NULL,
    created_by VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_by VARCHAR(120) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_pago_concepto_tipo CHECK (concepto_tipo IN (
        'CONSUMO','PLAN_PAGO','MULTA','CAUDALIMETRO','RECONEXION','OTRO','SIN_CLASIFICAR'
    )),
    CONSTRAINT ck_pago_concepto_importe CHECK (importe > 0),
    CONSTRAINT uk_pago_concepto_fingerprint UNIQUE (fingerprint)
);

CREATE INDEX idx_pago_concepto_pago ON pago_concepto(pago_id);
CREATE INDEX idx_pago_concepto_periodo_tipo ON pago_concepto(periodo_concepto, concepto_tipo);

CREATE TABLE correccion_financiera (
    id UUID PRIMARY KEY,
    entidad VARCHAR(60) NOT NULL,
    entidad_id UUID NOT NULL,
    campo VARCHAR(80) NOT NULL,
    valor_anterior TEXT,
    valor_nuevo TEXT,
    motivo VARCHAR(1000) NOT NULL,
    actor_id UUID,
    created_by VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_correccion_financiera_entidad
    ON correccion_financiera(entidad, entidad_id, created_at DESC);
