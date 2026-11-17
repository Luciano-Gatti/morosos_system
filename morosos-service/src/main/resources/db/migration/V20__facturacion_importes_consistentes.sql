ALTER TABLE facturacion
    ADD CONSTRAINT ck_facturacion_total_consistente
    CHECK (total_facturado = total_neto_sin_iva + total_iva);
