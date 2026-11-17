INSERT INTO permisos(id,codigo,nombre,descripcion,modulo,recurso,accion,activo,created_at,updated_at,created_by,updated_by)
VALUES (md5('permiso:CARGAS_IMPORTAR_FACTURACION_PAGOS')::uuid,'CARGAS_IMPORTAR_FACTURACION_PAGOS',
'Cargar facturación y pagos','Importa el estado de facturas y pagos desde Excel.',
'CARGAS','FACTURACION_PAGOS','IMPORTAR',TRUE,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'flyway_seed','flyway_seed');
INSERT INTO rol_permisos(id,rol_id,permiso_id,created_at)
SELECT md5(r.codigo || ':CARGAS_IMPORTAR_FACTURACION_PAGOS')::uuid,r.id,p.id,CURRENT_TIMESTAMP
FROM roles r CROSS JOIN permisos p
WHERE r.codigo IN ('ADMIN','SUPERVISOR') AND p.codigo='CARGAS_IMPORTAR_FACTURACION_PAGOS'
ON CONFLICT (rol_id,permiso_id) DO NOTHING;
UPDATE usuarios SET auth_version=auth_version+1;
