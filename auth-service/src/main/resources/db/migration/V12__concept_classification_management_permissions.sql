WITH asignaciones(rol_codigo,permiso_codigo) AS (
    VALUES
    ('SUPERVISOR','CONCEPTOS_RECAUDACION_ADMINISTRAR')
)
INSERT INTO rol_permisos(id,rol_id,permiso_id,created_at)
SELECT md5(a.rol_codigo || ':' || a.permiso_codigo)::uuid,r.id,p.id,CURRENT_TIMESTAMP
FROM asignaciones a
JOIN roles r ON r.codigo=a.rol_codigo
JOIN permisos p ON p.codigo=a.permiso_codigo
ON CONFLICT (rol_id,permiso_id) DO NOTHING;
