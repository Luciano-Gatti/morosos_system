WITH nuevos(codigo,nombre,descripcion,modulo,recurso,accion) AS (
    VALUES
    ('MEDICIONES_VER_LISTADO','Ver planillas de medicion','Consulta planillas de medicion cargadas.','MEDICIONES','PLANILLA','VER_LISTADO'),
    ('MEDICIONES_VER_DETALLE','Ver detalle de medicion','Consulta mediciones por planilla.','MEDICIONES','PLANILLA','VER_DETALLE'),
    ('MEDICIONES_CARGAR','Cargar mediciones','Importa planillas de mediciones.','MEDICIONES','PLANILLA','CARGAR'),
    ('MEDICIONES_VER_HISTORICO_INMUEBLE','Ver mediciones de inmueble','Consulta el historico de mediciones por inmueble.','MEDICIONES','HISTORICO','VER')
)
INSERT INTO permisos(
    id,codigo,nombre,descripcion,modulo,recurso,accion,activo,
    created_at,updated_at,created_by,updated_by
)
SELECT md5('permiso:' || codigo)::uuid,codigo,nombre,descripcion,modulo,recurso,accion,TRUE,
       CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'flyway_seed','flyway_seed'
FROM nuevos
ON CONFLICT (codigo) DO NOTHING;

WITH permisos_admin AS (
    SELECT codigo FROM permisos WHERE modulo='MEDICIONES'
),
permisos_lectura(codigo) AS (
    VALUES
    ('MEDICIONES_VER_LISTADO'),
    ('MEDICIONES_VER_DETALLE'),
    ('MEDICIONES_VER_HISTORICO_INMUEBLE')
),
asignaciones(rol_codigo,permiso_codigo) AS (
    SELECT 'ADMIN',codigo FROM permisos_admin
    UNION ALL SELECT 'SUPERVISOR',codigo FROM permisos_admin
    UNION ALL SELECT 'OPERADOR',codigo FROM permisos_lectura
    UNION ALL SELECT 'CONSULTA',codigo FROM permisos_lectura
    UNION ALL SELECT 'AUDITOR',codigo FROM permisos_lectura
)
INSERT INTO rol_permisos(id,rol_id,permiso_id,created_at)
SELECT md5(a.rol_codigo || ':' || a.permiso_codigo)::uuid,r.id,p.id,CURRENT_TIMESTAMP
FROM asignaciones a
JOIN roles r ON r.codigo=a.rol_codigo
JOIN permisos p ON p.codigo=a.permiso_codigo
ON CONFLICT (rol_id,permiso_id) DO NOTHING;
