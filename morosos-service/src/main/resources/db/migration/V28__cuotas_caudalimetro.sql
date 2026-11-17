ALTER TABLE factura_importada ADD COLUMN codigo_caudalimetro VARCHAR(100);
ALTER TABLE factura_carga_detalle ADD COLUMN codigo_caudalimetro VARCHAR(100);
ALTER TABLE factura_importada DROP CONSTRAINT factura_importada_check;
ALTER TABLE factura_importada ADD CONSTRAINT ck_factura_clase_periodo CHECK (
    (plan_pago AND periodo IS NULL AND codigo_caudalimetro IS NULL)
    OR (NOT plan_pago AND periodo IS NOT NULL AND codigo_caudalimetro IS NULL)
    OR (NOT plan_pago AND periodo IS NULL AND codigo_caudalimetro IS NOT NULL)
);
