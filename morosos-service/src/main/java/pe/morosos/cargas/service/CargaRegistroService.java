package pe.morosos.cargas.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.morosos.cargas.dto.CargaIncidenciaResponse;
import pe.morosos.cargas.dto.CargaResponse;
import pe.morosos.cargas.model.CargaEstado;
import pe.morosos.cargas.model.CargaOrigen;
import pe.morosos.cargas.model.CargaTipo;
import pe.morosos.cargas.model.IncidenciaResultado;
import pe.morosos.common.exception.ResourceNotFoundException;
import pe.morosos.security.TechnicalActorProvider;

@Service
@RequiredArgsConstructor
public class CargaRegistroService {
    private final JdbcClient jdbc;
    private final TechnicalActorProvider actorProvider;
    private final ObjectMapper objectMapper;

    @Transactional
    public UUID iniciar(CargaTipo tipo, CargaOrigen origen, String sistemaOrigen,
                        LocalDate periodo, String archivoNombre) {
        UUID id = UUID.randomUUID();
        Timestamp now = Timestamp.from(Instant.now());
        String actor = actorProvider.getActorName();
        jdbc.sql("""
                insert into carga_proceso(
                    id,tipo,origen,sistema_origen,periodo_referencia,estado,archivo_nombre,
                    iniciado_at,created_by,created_at,updated_by,updated_at
                ) values (?,?,?,?,?,'PROCESANDO',?,?,?,?,?,?)
                """)
                .params(id, tipo.name(), origen.name(), sistemaOrigen, periodo, archivoNombre,
                        now, actor, now, actor, now)
                .update();
        return id;
    }

    @Transactional
    public void finalizar(UUID id, CargaMetricas m) {
        CargaEstado estado = m.procesados() == 0 && m.creados() == 0
                && m.actualizados() == 0 && m.sinCambios() == 0
                ? CargaEstado.FALLIDA
                : m.tieneIncidencias()
                    ? CargaEstado.COMPLETADA_CON_INCIDENCIAS
                    : CargaEstado.COMPLETADA;
        Timestamp now = Timestamp.from(Instant.now());
        jdbc.sql("""
                update carga_proceso set estado=?, procesados=?, creados=?, actualizados=?,
                    sin_cambios=?, ignorados=?, conflictos=?, errores=?, no_encontrados=?,
                    monto_total=?, finalizado_at=?, updated_by=?, updated_at=? where id=?
                """)
                .params(estado.name(), m.procesados(), m.creados(), m.actualizados(),
                        m.sinCambios(), m.ignorados(), m.conflictos(), m.errores(),
                        m.noEncontrados(), m.montoTotal(), now,
                        actorProvider.getActorName(), now, id)
                .update();
    }

    @Transactional
    public void fallar(UUID id, String codigo, String mensaje) {
        incidencia(id, null, null, IncidenciaResultado.ERROR, codigo, mensaje, null);
        Timestamp now = Timestamp.from(Instant.now());
        jdbc.sql("""
                update carga_proceso set estado='FALLIDA', errores=errores+1,
                    finalizado_at=?, updated_by=?, updated_at=? where id=?
                """)
                .params(now, actorProvider.getActorName(), now, id).update();
    }

    @Transactional
    public void incidencia(UUID cargaId, Integer fila, String cuenta,
                           IncidenciaResultado resultado, String codigo,
                           String mensaje, JsonNode payload) {
        jdbc.sql("""
                insert into carga_incidencia(
                    id,carga_id,fila,cuenta,resultado,codigo,mensaje,payload,created_by,created_at
                ) values (?,?,?,?,?,?,?,cast(? as jsonb),?,?)
                """)
                .params(UUID.randomUUID(), cargaId, fila, cuenta, resultado.name(), codigo,
                        mensaje, payload == null ? null : payload.toString(),
                        actorProvider.getActorName(), Timestamp.from(Instant.now()))
                .update();
    }

    @Transactional(readOnly = true)
    public Page<CargaResponse> listar(CargaTipo tipo, CargaOrigen origen, CargaEstado estado,
                                      Pageable pageable) {
        StringBuilder where = new StringBuilder("where tipo in ('INMUEBLES','DEUDA','FACTURACION_PAGOS')");
        var params = new java.util.ArrayList<Object>();
        addFilter(where, params, "tipo = ?", tipo == null ? null : tipo.name());
        addFilter(where, params, "origen = ?", origen == null ? null : origen.name());
        addFilter(where, params, "estado = ?", estado == null ? null : estado.name());
        long total = jdbc.sql("select count(*) from carga_proceso " + where)
                .params(params).query(Long.class).single();
        var pageParams = new java.util.ArrayList<>(params);
        pageParams.add(pageable.getPageSize());
        pageParams.add(pageable.getOffset());
        var content = jdbc.sql("select * from carga_proceso " + where
                        + " order by created_at desc, id desc limit ? offset ?")
                .params(pageParams).query(this::mapCarga).list();
        return new PageImpl<>(content, pageable, total);
    }

    @Transactional(readOnly = true)
    public CargaResponse obtener(UUID id) {
        return jdbc.sql("select * from carga_proceso where id=? and tipo in ('INMUEBLES','DEUDA','FACTURACION_PAGOS')")
                .param(id).query(this::mapCarga).optional()
                .orElseThrow(() -> new ResourceNotFoundException("Carga no encontrada"));
    }

    @Transactional(readOnly = true)
    public Page<CargaIncidenciaResponse> incidencias(
            UUID id,
            IncidenciaResultado resultado,
            String cuenta,
            String codigo,
            String usuario,
            Instant desde,
            Instant hasta,
            Pageable pageable) {
        obtener(id);
        StringBuilder where = new StringBuilder("where carga_id = ?");
        var params = new java.util.ArrayList<Object>();
        params.add(id);
        addFilter(where, params, "resultado = ?", resultado == null ? null : resultado.name());
        addFilter(where, params, "lower(coalesce(cuenta,'')) like ?", containsFilter(cuenta));
        addFilter(where, params, "lower(coalesce(codigo,'')) like ?", containsFilter(codigo));
        addFilter(where, params, "lower(coalesce(created_by,'')) like ?", containsFilter(usuario));
        addFilter(where, params, "created_at >= ?", desde == null ? null : java.sql.Timestamp.from(desde));
        addFilter(where, params, "created_at <= ?", hasta == null ? null : java.sql.Timestamp.from(hasta));
        long total = jdbc.sql("select count(*) from carga_incidencia " + where)
                .params(params).query(Long.class).single();
        var pageParams = new java.util.ArrayList<>(params);
        pageParams.add(pageable.getPageSize());
        pageParams.add(pageable.getOffset());
        var content = jdbc.sql("select * from carga_incidencia " + where
                        + " order by fila nulls last, created_at, id limit ? offset ?")
                .params(pageParams).query(this::mapIncidencia).list();
        return new PageImpl<>(content, pageable, total);
    }

    private void addFilter(StringBuilder where, java.util.List<Object> params, String predicate, Object value) {
        if (value != null) {
            where.append(" and ").append(predicate);
            params.add(value);
        }
    }

    private String containsFilter(String value) {
        return value == null || value.isBlank()
                ? null
                : "%" + value.trim().toLowerCase() + "%";
    }

    private CargaResponse mapCarga(ResultSet rs, int row) throws SQLException {
        var finalizado = rs.getTimestamp("finalizado_at");
        return new CargaResponse(
                rs.getObject("id", UUID.class), CargaTipo.valueOf(rs.getString("tipo")),
                CargaOrigen.valueOf(rs.getString("origen")), rs.getString("sistema_origen"),
                rs.getObject("periodo_referencia", LocalDate.class),
                CargaEstado.valueOf(rs.getString("estado")), rs.getString("archivo_nombre"),
                rs.getInt("procesados"), rs.getInt("creados"), rs.getInt("actualizados"),
                rs.getInt("sin_cambios"), rs.getInt("ignorados"), rs.getInt("conflictos"),
                rs.getInt("errores"), rs.getInt("no_encontrados"), rs.getBigDecimal("monto_total"),
                rs.getTimestamp("iniciado_at").toInstant(),
                finalizado == null ? null : finalizado.toInstant(),
                rs.getString("created_by"), rs.getTimestamp("created_at").toInstant(),
                rs.getObject("facturas_con_diferencias", Integer.class), rs.getObject("facturas_repetidas_iguales", Integer.class)
        );
    }

    private CargaIncidenciaResponse mapIncidencia(ResultSet rs, int row) throws SQLException {
        JsonNode payload = null;
        String raw = rs.getString("payload");
        if (raw != null) {
            try {
                payload = objectMapper.readTree(raw);
            } catch (Exception ignored) {
                // Diagnostic payload must not break incident listing.
            }
        }
        return new CargaIncidenciaResponse(
                rs.getObject("id", UUID.class), rs.getObject("carga_id", UUID.class),
                rs.getObject("fila", Integer.class), rs.getString("cuenta"),
                IncidenciaResultado.valueOf(rs.getString("resultado")),
                rs.getString("codigo"), rs.getString("mensaje"), payload,
                rs.getString("created_by"), rs.getTimestamp("created_at").toInstant()
        );
    }

    public record CargaMetricas(
            int procesados, int creados, int actualizados, int sinCambios,
            int ignorados, int conflictos, int errores, int noEncontrados,
            BigDecimal montoTotal
    ) {
        public boolean tieneIncidencias() {
            return ignorados + conflictos + errores + noEncontrados > 0;
        }
    }
}
