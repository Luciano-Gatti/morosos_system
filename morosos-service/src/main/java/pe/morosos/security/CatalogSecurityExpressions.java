package pe.morosos.security;

public final class CatalogSecurityExpressions {
    private CatalogSecurityExpressions() {
    }

    public static final String GRUPOS_READ = "hasAnyAuthority("
            + "T(pe.morosos.security.PermissionCodes).CONFIG_VER_GRUPOS,"
            + "T(pe.morosos.security.PermissionCodes).INMUEBLES_VER_LISTADO,"
            + "T(pe.morosos.security.PermissionCodes).SEGUIMIENTO_VER_BANDEJA,"
            + "T(pe.morosos.security.PermissionCodes).REPORTES_VER_MOROSOS_GRUPO_DISTRITO,"
            + "T(pe.morosos.security.PermissionCodes).REPORTES_VER_ESTADO_INMUEBLES,"
            + "T(pe.morosos.security.PermissionCodes).REPORTES_VER_ACCIONES_FECHAS,"
            + "T(pe.morosos.security.PermissionCodes).REPORTES_VER_HISTORIAL_MOVIMIENTOS,"
            + "T(pe.morosos.security.PermissionCodes).REPORTES_VER_PORCENTAJES_MOROSIDAD,"
            + "T(pe.morosos.security.PermissionCodes).REPORTES_VER_ACCIONES_REGULARIZACION"
            + ")";

    public static final String DISTRITOS_READ = "hasAnyAuthority("
            + "T(pe.morosos.security.PermissionCodes).CONFIG_VER_DISTRITOS,"
            + "T(pe.morosos.security.PermissionCodes).INMUEBLES_VER_LISTADO,"
            + "T(pe.morosos.security.PermissionCodes).SEGUIMIENTO_VER_BANDEJA,"
            + "T(pe.morosos.security.PermissionCodes).REPORTES_VER_MOROSOS_GRUPO_DISTRITO,"
            + "T(pe.morosos.security.PermissionCodes).REPORTES_VER_ESTADO_INMUEBLES,"
            + "T(pe.morosos.security.PermissionCodes).REPORTES_VER_ACCIONES_FECHAS,"
            + "T(pe.morosos.security.PermissionCodes).REPORTES_VER_HISTORIAL_MOVIMIENTOS,"
            + "T(pe.morosos.security.PermissionCodes).REPORTES_VER_PORCENTAJES_MOROSIDAD,"
            + "T(pe.morosos.security.PermissionCodes).REPORTES_VER_ACCIONES_REGULARIZACION"
            + ")";

    public static final String ETAPAS_READ = "hasAnyAuthority("
            + "T(pe.morosos.security.PermissionCodes).CONFIG_VER_ETAPAS,"
            + "T(pe.morosos.security.PermissionCodes).SEGUIMIENTO_VER_BANDEJA"
            + ")";

    public static final String PARAMETROS_SEGUIMIENTO_READ = "hasAnyAuthority("
            + "T(pe.morosos.security.PermissionCodes).CONFIG_VER_PARAMETROS_SEGUIMIENTO,"
            + "T(pe.morosos.security.PermissionCodes).SEGUIMIENTO_VER_BANDEJA"
            + ")";

    public static final String MOTIVOS_CIERRE_READ = "hasAnyAuthority("
            + "T(pe.morosos.security.PermissionCodes).CONFIG_VER_MOTIVOS_CIERRE,"
            + "T(pe.morosos.security.PermissionCodes).SEGUIMIENTO_VER_BANDEJA"
            + ")";

    public static final String GRUPO_DISTRITO_READ = "hasAnyAuthority("
            + "T(pe.morosos.security.PermissionCodes).CONFIG_VER_GRUPO_DISTRITO,"
            + "T(pe.morosos.security.PermissionCodes).SEGUIMIENTO_VER_BANDEJA"
            + ")";
}
