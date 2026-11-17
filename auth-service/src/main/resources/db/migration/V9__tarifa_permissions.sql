WITH nuevos(codigo,nombre,descripcion,modulo,recurso,accion) AS (
    VALUES
    ('CONFIG_VER_TARIFAS','Ver tarifas','Consulta el catalogo de tarifas y tramos vigentes.','CONFIGURACION','TARIFA','VER'),
    ('CONFIG_ADMINISTRAR_TARIFAS','Administrar tarifas','Crea, modifica y activa o desactiva tarifas.','CONFIGURACION','TARIFA','ADMINISTRAR')
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
    ('ADMIN','CONFIG_VER_TARIFAS'),
    ('ADMIN','CONFIG_ADMINISTRAR_TARIFAS'),
    ('SUPERVISOR','CONFIG_VER_TARIFAS'),
    ('OPERADOR','CONFIG_VER_TARIFAS'),
    ('CONSULTA','CONFIG_VER_TARIFAS'),
    ('AUDITOR','CONFIG_VER_TARIFAS')
)
INSERT INTO rol_permisos(id,rol_id,permiso_id,created_at)
SELECT md5(a.rol_codigo || ':' || a.permiso_codigo)::uuid,r.id,p.id,CURRENT_TIMESTAMP
FROM asignaciones a
JOIN roles r ON r.codigo=a.rol_codigo
JOIN permisos p ON p.codigo=a.permiso_codigo
ON CONFLICT (rol_id,permiso_id) DO NOTHING;
