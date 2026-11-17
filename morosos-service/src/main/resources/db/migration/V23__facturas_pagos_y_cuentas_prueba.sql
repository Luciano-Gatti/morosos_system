ALTER TABLE inmueble ADD COLUMN es_prueba BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE inmueble SET es_prueba = TRUE WHERE cuenta = '150-999999-999';
ALTER TABLE carga_proceso DROP CONSTRAINT ck_carga_proceso_tipo;
ALTER TABLE carga_proceso ADD CONSTRAINT ck_carga_proceso_tipo CHECK
(tipo IN ('INMUEBLES','DEUDA','CONCEPTOS_ADEUDADOS','FACTURACION','PAGOS','MEDICIONES','FACTURACION_PAGOS'));

CREATE TABLE factura_importada (
 cuenta VARCHAR(50) NOT NULL,
 numero VARCHAR(100) NOT NULL,
 inmueble_id UUID NOT NULL REFERENCES inmueble(id),
 periodo DATE,
 plan_pago BOOLEAN NOT NULL,
 pagado BOOLEAN NOT NULL,
 fecha_pago DATE,
 importe NUMERIC(18,2) NOT NULL CHECK (importe >= 0),
 carga_id UUID NOT NULL REFERENCES carga_proceso(id),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (cuenta, numero),
 CHECK ((plan_pago AND periodo IS NULL) OR (NOT plan_pago AND periodo IS NOT NULL)),
 CHECK ((pagado AND fecha_pago IS NOT NULL) OR (NOT pagado AND fecha_pago IS NULL))
);
CREATE TABLE factura_carga_detalle (
 carga_id UUID NOT NULL REFERENCES carga_proceso(id),
 fila INTEGER NOT NULL,
 cuenta VARCHAR(50) NOT NULL,
 numero VARCHAR(100) NOT NULL,
 periodo DATE,
 plan_pago BOOLEAN NOT NULL,
 pagado BOOLEAN NOT NULL,
 fecha_pago DATE,
 importe NUMERIC(18,2) NOT NULL,
 resultado VARCHAR(20) NOT NULL,
 PRIMARY KEY(carga_id, fila)
);
CREATE INDEX idx_factura_importada_inmueble ON factura_importada(inmueble_id);
