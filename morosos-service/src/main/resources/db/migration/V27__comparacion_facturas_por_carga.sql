ALTER TABLE carga_proceso ADD COLUMN facturas_con_diferencias INTEGER,
                          ADD COLUMN facturas_repetidas_iguales INTEGER;

CREATE TABLE factura_carga_cambio (
    carga_id UUID NOT NULL REFERENCES carga_proceso(id),
    fila INTEGER NOT NULL,
    cuenta VARCHAR(50) NOT NULL,
    numero VARCHAR(100) NOT NULL,
    resultado VARCHAR(20) NOT NULL,
    motivo TEXT,
    campos JSONB NOT NULL,
    PRIMARY KEY (carga_id, fila),
    UNIQUE(carga_id, cuenta, numero)
);
