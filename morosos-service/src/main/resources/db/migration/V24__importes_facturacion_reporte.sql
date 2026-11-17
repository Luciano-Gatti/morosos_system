-- Existing amounts cannot be inferred from collected amounts: reimport source Excel to enrich.
ALTER TABLE factura_importada ADD COLUMN importe_neto NUMERIC(18,2), ADD COLUMN iva NUMERIC(18,2), ADD COLUMN importe_descuentos NUMERIC(18,2);
ALTER TABLE factura_carga_detalle ADD COLUMN importe_neto NUMERIC(18,2), ADD COLUMN iva NUMERIC(18,2), ADD COLUMN importe_descuentos NUMERIC(18,2);
CREATE INDEX idx_factura_importada_periodo ON factura_importada(periodo);
CREATE INDEX idx_factura_importada_fecha_pago ON factura_importada(fecha_pago) WHERE pagado;
