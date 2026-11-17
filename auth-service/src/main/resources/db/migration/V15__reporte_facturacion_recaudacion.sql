INSERT INTO permisos(id,codigo,nombre,descripcion,modulo,recurso,accion,activo,created_at,updated_at,created_by,updated_by)
VALUES(md5('permiso:REPORTES_VER_FACTURACION_RECAUDACION')::uuid,'REPORTES_VER_FACTURACION_RECAUDACION',
'Ver facturación y recaudación','Panel mensual de emisión y pagos.','REPORTES','FACTURACION_RECAUDACION','VER',true,
CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'flyway_seed','flyway_seed');
INSERT INTO rol_permisos(id,rol_id,permiso_id,created_at)
SELECT md5(r.codigo || ':REPORTES_VER_FACTURACION_RECAUDACION')::uuid,r.id,p.id,CURRENT_TIMESTAMP
FROM roles r CROSS JOIN permisos p WHERE r.codigo IN ('ADMIN','SUPERVISOR','CONSULTA','AUDITOR') AND p.codigo='REPORTES_VER_FACTURACION_RECAUDACION'
ON CONFLICT(rol_id,permiso_id) DO NOTHING;
UPDATE usuarios SET auth_version=auth_version+1;
