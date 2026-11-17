WITH nuevos(codigo,nombre,descripcion,modulo,recurso,accion) AS (
    VALUES
    ('CARGAS_VER_LISTADO','Ver cargas','Consulta el listado unificado de cargas.','CARGAS','CARGA','VER_LISTADO'),
    ('CARGAS_VER_DETALLE','Ver detalle de carga','Consulta el resumen de una carga.','CARGAS','CARGA','VER_DETALLE'),
    ('CARGAS_VER_ERRORES','Ver incidencias de carga','Consulta errores, conflictos y rechazados.','CARGAS','INCIDENCIA','VER'),
    ('CARGAS_IMPORTAR_INMUEBLES','Cargar inmuebles','Sincroniza el padron desde un archivo.','CARGAS','INMUEBLES','IMPORTAR'),
    ('CARGAS_SINCRONIZAR_INMUEBLES_API','Sincronizar inmuebles por API','Ejecuta sincronizacion de inmuebles por API.','CARGAS','INMUEBLES','SINCRONIZAR_API'),
    ('CARGAS_IMPORTAR_DEUDA','Cargar deuda','Carga un snapshot de deuda.','CARGAS','DEUDA','IMPORTAR'),
    ('CARGAS_SINCRONIZAR_DEUDA_API','Sincronizar deuda por API','Ejecuta sincronizacion de deuda por API.','CARGAS','DEUDA','SINCRONIZAR_API'),
    ('FACTURACION_VER_LISTADO','Ver facturacion','Consulta facturaciones emitidas.','FACTURACION','FACTURACION','VER_LISTADO'),
    ('FACTURACION_VER_DETALLE','Ver detalle de facturacion','Consulta una facturacion emitida.','FACTURACION','FACTURACION','VER_DETALLE'),
    ('FACTURACION_CARGAR','Cargar facturacion','Carga snapshots de facturacion.','FACTURACION','FACTURACION','CARGAR'),
    ('FACTURACION_VER_HISTORICO_INMUEBLE','Ver facturacion de inmueble','Consulta el historico de facturacion del inmueble.','FACTURACION','HISTORICO','VER'),
    ('FACTURACION_VER_CONFLICTOS','Ver conflictos de facturacion','Consulta diferencias detectadas en cargas.','FACTURACION','CONFLICTO','VER'),
    ('FACTURACION_CORREGIR_CONTROLADO','Corregir facturacion','Realiza correcciones autorizadas con motivo.','FACTURACION','FACTURACION','CORREGIR_CONTROLADO'),
    ('RECAUDACION_VER_PAGOS','Ver pagos','Consulta pagos efectivos.','RECAUDACION','PAGO','VER_LISTADO'),
    ('RECAUDACION_VER_DETALLE_PAGO','Ver detalle de pago','Consulta recibo y conceptos pagados.','RECAUDACION','PAGO','VER_DETALLE'),
    ('RECAUDACION_CARGAR_PAGOS','Cargar pagos','Carga pagos efectivos de caja.','RECAUDACION','PAGO','CARGAR'),
    ('RECAUDACION_VER_HISTORICO_INMUEBLE','Ver pagos de inmueble','Consulta el historico de pagos del inmueble.','RECAUDACION','HISTORICO','VER'),
    ('RECAUDACION_VER_REPORTES','Ver reportes de recaudacion','Consulta reportes de ingresos.','RECAUDACION','REPORTE','VER'),
    ('RECAUDACION_VER_CONFLICTOS','Ver conflictos de pagos','Consulta conflictos de pagos.','RECAUDACION','CONFLICTO','VER'),
    ('RECAUDACION_EXPORTAR','Exportar recaudacion','Exporta listados y reportes de pagos.','RECAUDACION','REPORTE','EXPORTAR'),
    ('COBRABILIDAD_VER_PERIODO','Ver cobrabilidad por periodo','Consulta cobrabilidad temporal.','COBRABILIDAD','REPORTE','VER_PERIODO'),
    ('COBRABILIDAD_VER_DISTRITO','Ver cobrabilidad por distrito','Consulta cobrabilidad territorial.','COBRABILIDAD','REPORTE','VER_DISTRITO'),
    ('COBRABILIDAD_VER_GRUPO','Ver cobrabilidad por grupo','Consulta cobrabilidad por grupo.','COBRABILIDAD','REPORTE','VER_GRUPO'),
    ('COBRABILIDAD_VER_FACTURADO_VS_COBRADO','Ver facturado vs cobrado','Consulta el indicador general.','COBRABILIDAD','REPORTE','VER_FACTURADO_VS_COBRADO'),
    ('COBRABILIDAD_VER_CONSUMOS_VENCIDOS','Ver consumos vencidos pagados','Consulta recuperacion de consumos vencidos.','COBRABILIDAD','REPORTE','VER_CONSUMOS_VENCIDOS'),
    ('COBRABILIDAD_VER_PLANES_PAGO','Ver planes de pago cobrados','Consulta cuotas de planes cobradas.','COBRABILIDAD','REPORTE','VER_PLANES_PAGO'),
    ('COBRABILIDAD_EXPORTAR','Exportar cobrabilidad','Exporta reportes de cobrabilidad.','COBRABILIDAD','REPORTE','EXPORTAR'),
    ('CONCEPTOS_RECAUDACION_VER','Ver tipos de conceptos','Consulta el catalogo de conceptos.','RECAUDACION','CONCEPTO','VER'),
    ('CONCEPTOS_RECAUDACION_ADMINISTRAR','Administrar conceptos','Administra reglas de clasificacion.','RECAUDACION','CONCEPTO','ADMINISTRAR')
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
    SELECT codigo FROM permisos
    WHERE modulo IN ('CARGAS','FACTURACION','RECAUDACION','COBRABILIDAD')
),
permisos_supervisor(codigo) AS (
    VALUES
    ('CARGAS_VER_LISTADO'),('CARGAS_VER_DETALLE'),('CARGAS_VER_ERRORES'),
    ('CARGAS_IMPORTAR_INMUEBLES'),('CARGAS_SINCRONIZAR_INMUEBLES_API'),
    ('CARGAS_IMPORTAR_DEUDA'),('CARGAS_SINCRONIZAR_DEUDA_API'),
    ('FACTURACION_VER_LISTADO'),('FACTURACION_VER_DETALLE'),('FACTURACION_CARGAR'),
    ('FACTURACION_VER_HISTORICO_INMUEBLE'),('FACTURACION_VER_CONFLICTOS'),
    ('RECAUDACION_VER_PAGOS'),('RECAUDACION_VER_DETALLE_PAGO'),('RECAUDACION_CARGAR_PAGOS'),
    ('RECAUDACION_VER_HISTORICO_INMUEBLE'),('RECAUDACION_VER_REPORTES'),
    ('RECAUDACION_VER_CONFLICTOS'),('RECAUDACION_EXPORTAR'),
    ('COBRABILIDAD_VER_PERIODO'),('COBRABILIDAD_VER_DISTRITO'),('COBRABILIDAD_VER_GRUPO'),
    ('COBRABILIDAD_VER_FACTURADO_VS_COBRADO'),('COBRABILIDAD_VER_CONSUMOS_VENCIDOS'),
    ('COBRABILIDAD_VER_PLANES_PAGO'),('COBRABILIDAD_EXPORTAR'),('CONCEPTOS_RECAUDACION_VER')
),
permisos_operador(codigo) AS (
    VALUES
    ('FACTURACION_VER_LISTADO'),('FACTURACION_VER_DETALLE'),('FACTURACION_VER_HISTORICO_INMUEBLE'),
    ('RECAUDACION_VER_PAGOS'),('RECAUDACION_VER_DETALLE_PAGO'),
    ('RECAUDACION_VER_HISTORICO_INMUEBLE'),('CONCEPTOS_RECAUDACION_VER')
),
permisos_lectura(codigo) AS (
    VALUES
    ('CARGAS_VER_LISTADO'),('CARGAS_VER_DETALLE'),('CARGAS_VER_ERRORES'),
    ('FACTURACION_VER_LISTADO'),('FACTURACION_VER_DETALLE'),('FACTURACION_VER_HISTORICO_INMUEBLE'),
    ('RECAUDACION_VER_PAGOS'),('RECAUDACION_VER_DETALLE_PAGO'),
    ('RECAUDACION_VER_HISTORICO_INMUEBLE'),('RECAUDACION_VER_REPORTES'),
    ('RECAUDACION_VER_CONFLICTOS'),('COBRABILIDAD_VER_PERIODO'),
    ('COBRABILIDAD_VER_DISTRITO'),('COBRABILIDAD_VER_GRUPO'),
    ('COBRABILIDAD_VER_FACTURADO_VS_COBRADO'),('COBRABILIDAD_VER_CONSUMOS_VENCIDOS'),
    ('COBRABILIDAD_VER_PLANES_PAGO'),('CONCEPTOS_RECAUDACION_VER')
),
asignaciones(rol_codigo,permiso_codigo) AS (
    SELECT 'ADMIN',codigo FROM permisos_admin
    UNION ALL SELECT 'SUPERVISOR',codigo FROM permisos_supervisor
    UNION ALL SELECT 'OPERADOR',codigo FROM permisos_operador
    UNION ALL SELECT 'CONSULTA',codigo FROM permisos_lectura
    UNION ALL SELECT 'AUDITOR',codigo FROM permisos_lectura
    UNION ALL SELECT 'AUDITOR','RECAUDACION_EXPORTAR'
    UNION ALL SELECT 'AUDITOR','COBRABILIDAD_EXPORTAR'
)
INSERT INTO rol_permisos(id,rol_id,permiso_id,created_at)
SELECT md5(a.rol_codigo || ':' || a.permiso_codigo)::uuid,r.id,p.id,CURRENT_TIMESTAMP
FROM asignaciones a
JOIN roles r ON r.codigo=a.rol_codigo
JOIN permisos p ON p.codigo=a.permiso_codigo
ON CONFLICT (rol_id,permiso_id) DO NOTHING;
