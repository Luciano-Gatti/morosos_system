ALTER TABLE carga_incidencia
    ADD COLUMN estado_revision VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
    ADD COLUMN observacion_revision VARCHAR(1000),
    ADD COLUMN revisado_by VARCHAR(120),
    ADD COLUMN revisado_at TIMESTAMPTZ,
    ADD CONSTRAINT ck_carga_incidencia_estado_revision CHECK (
        estado_revision IN ('PENDIENTE','EN_REVISION','RESUELTO','DESCARTADO')
    );

CREATE INDEX idx_carga_incidencia_revision
    ON carga_incidencia(estado_revision, created_at DESC)
    WHERE resultado = 'CONFLICTO';
