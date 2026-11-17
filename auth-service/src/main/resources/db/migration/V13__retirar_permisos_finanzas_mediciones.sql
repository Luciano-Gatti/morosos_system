-- Conserva los registros históricos; deshabilita los módulos retirados.
UPDATE permisos SET activo = false
WHERE codigo ~ '^(FACTURACION_|RECAUDACION_|COBRABILIDAD_|MEDICIONES_|CONCEPTOS_RECAUDACION_)'
   OR codigo IN ('CONFIG_VER_TARIFAS', 'CONFIG_ADMINISTRAR_TARIFAS');

-- Obliga a renovar las sesiones con el catálogo de permisos vigente.
UPDATE usuarios SET auth_version = auth_version + 1;
