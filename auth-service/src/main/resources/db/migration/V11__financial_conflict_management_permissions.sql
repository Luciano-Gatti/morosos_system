WITH nuevos(codigo,nombre,descripcion,modulo,recurso,accion) AS (
    VALUES
    ('FACTURACION_GESTIONAR_CONFLICTOS','Gestionar conflictos de facturacion','Permite revisar, resolver o descartar conflictos de facturacion.','FACTURACION','CONFLICTO','GESTIONAR'),
    ('RECAUDACION_GESTIONAR_CONFLICTOS','Gestionar conflictos de pagos','Permite revisar, resolver o descartar conflictos de pagos.','RECAUDACION','CONFLICTO','GESTIONAR')
)
INSERT INTO permisos(
    id,codigo,nombre,descripcion,modulo,recurso,accion,activo,
    created_at,updated_at,created_by,updated_by
)
SELECT md5('permiso:' || codigo)::uuid,codigo,nombre,descripcion,modulo,recurso,accion,TRUE,
       CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'flyway_seed','flyway_seed'
FROM nuevos
ON CONFLICT (codigo) DO NOTHING;

WITH asignaciones(rol_codigo,permiso_codigo) AS (
    VALUES
    ('ADMIN','FACTURACION_GESTIONAR_CONFLICTOS'),
    ('ADMIN','RECAUDACION_GESTIONAR_CONFLICTOS'),
    ('SUPERVISOR','FACTURACION_GESTIONAR_CONFLICTOS'),
    ('SUPERVISOR','RECAUDACION_GESTIONAR_CONFLICTOS'),
    ('CONSULTA','FACTURACION_VER_CONFLICTOS'),
    ('AUDITOR','FACTURACION_VER_CONFLICTOS')
)
INSERT INTO rol_permisos(id,rol_id,permiso_id,created_at)
SELECT md5(a.rol_codigo || ':' || a.permiso_codigo)::uuid,r.id,p.id,CURRENT_TIMESTAMP
FROM asignaciones a
JOIN roles r ON r.codigo=a.rol_codigo
JOIN permisos p ON p.codigo=a.permiso_codigo
ON CONFLICT (rol_id,permiso_id) DO NOTHING;
