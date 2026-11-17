ALTER TABLE factura_importada ADD COLUMN fecha_emision DATE, ADD COLUMN fecha_vencimiento DATE;
ALTER TABLE factura_carga_detalle ADD COLUMN fecha_emision DATE, ADD COLUMN fecha_vencimiento DATE;
CREATE INDEX idx_factura_emision ON factura_importada(fecha_emision);
