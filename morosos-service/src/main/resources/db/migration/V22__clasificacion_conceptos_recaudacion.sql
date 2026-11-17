CREATE TABLE concepto_clasificacion_regla (
    id UUID PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    patron VARCHAR(300) NOT NULL,
    tipo_coincidencia VARCHAR(30) NOT NULL,
    concepto_tipo VARCHAR(40) NOT NULL,
    prioridad INT NOT NULL,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_by VARCHAR(120) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_concepto_regla_coincidencia CHECK (
        tipo_coincidencia IN ('CONTIENE','EXPRESION_REGULAR')
    ),
    CONSTRAINT ck_concepto_regla_tipo CHECK (
        concepto_tipo IN ('CONSUMO','PLAN_PAGO','MULTA','CAUDALIMETRO','RECONEXION','OTRO')
    ),
    CONSTRAINT ck_concepto_regla_prioridad CHECK (prioridad > 0)
);

CREATE UNIQUE INDEX uk_concepto_regla_patron_tipo
    ON concepto_clasificacion_regla(lower(patron), tipo_coincidencia);
CREATE INDEX idx_concepto_regla_activa_prioridad
    ON concepto_clasificacion_regla(activa, prioridad, nombre);
CREATE INDEX idx_pago_concepto_sin_clasificar
    ON pago_concepto(created_at DESC) WHERE concepto_tipo='SIN_CLASIFICAR';

INSERT INTO concepto_clasificacion_regla(
    id,nombre,patron,tipo_coincidencia,concepto_tipo,prioridad,activa,
    created_by,created_at,updated_by,updated_at
) VALUES
    (md5('concepto-regla:plan-pago')::uuid,'Plan de pago','PLAN (DE )?PAGO',
     'EXPRESION_REGULAR','PLAN_PAGO',10,TRUE,'flyway_seed',CURRENT_TIMESTAMP,'flyway_seed',CURRENT_TIMESTAMP),
    (md5('concepto-regla:consumo')::uuid,'Consumo','CONSUMO',
     'CONTIENE','CONSUMO',20,TRUE,'flyway_seed',CURRENT_TIMESTAMP,'flyway_seed',CURRENT_TIMESTAMP),
    (md5('concepto-regla:multa')::uuid,'Multa','MULTA',
     'CONTIENE','MULTA',30,TRUE,'flyway_seed',CURRENT_TIMESTAMP,'flyway_seed',CURRENT_TIMESTAMP),
    (md5('concepto-regla:caudalimetro')::uuid,'Caudalimetro','CAUDALIMETRO',
     'CONTIENE','CAUDALIMETRO',40,TRUE,'flyway_seed',CURRENT_TIMESTAMP,'flyway_seed',CURRENT_TIMESTAMP),
    (md5('concepto-regla:reconexion')::uuid,'Reconexion','RECONEXION',
     'CONTIENE','RECONEXION',50,TRUE,'flyway_seed',CURRENT_TIMESTAMP,'flyway_seed',CURRENT_TIMESTAMP);
