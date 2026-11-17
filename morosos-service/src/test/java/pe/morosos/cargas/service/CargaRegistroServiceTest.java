package pe.morosos.cargas.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import java.util.*;
import java.time.Instant;
import java.sql.Timestamp;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.data.domain.PageRequest;
import pe.morosos.cargas.model.*;
import pe.morosos.security.TechnicalActorProvider;

class CargaRegistroServiceTest {
    JdbcClient jdbc = mock(JdbcClient.class);
    CargaRegistroService service = spy(new CargaRegistroService(jdbc, mock(TechnicalActorProvider.class), new ObjectMapper()));
    List<String> sqls = new ArrayList<>();
    List<List<?>> bindings = new ArrayList<>();

    @BeforeEach @SuppressWarnings({"unchecked", "rawtypes"})
    void setup() {
        when(jdbc.sql(anyString())).thenAnswer(inv -> {
            sqls.add(inv.getArgument(0));
            var spec = mock(JdbcClient.StatementSpec.class, RETURNS_SELF);
            when(spec.params(anyList())).thenAnswer(args -> {
                bindings.add(new ArrayList<>((List<?>) args.getArgument(0))); return spec;
            });
            var count = mock(JdbcClient.MappedQuerySpec.class);
            when(count.single()).thenReturn(0L);
            when(spec.query(Long.class)).thenReturn(count);
            var rows = mock(JdbcClient.MappedQuerySpec.class);
            when(rows.list()).thenReturn(List.of());
            when(spec.query(any(RowMapper.class))).thenReturn(rows);
            return spec;
        });
    }
    @Test void listaSinFiltrosNoEnviaParametrosNulos() {
        var page = service.listar(null, null, null, PageRequest.of(2, 25));
        assertEquals(0, page.getTotalElements());
        assertEquals(List.of(), bindings.get(0));
        assertEquals(List.of(25, 50L), bindings.get(1));
        assertTrue(sqls.stream().noneMatch(sql -> sql.contains("is null")));
        assertTrue(sqls.get(0).contains("'FACTURACION_PAGOS'"));
    }
    @Test void listaConFiltrosUsaMismosValoresParaConteoYContenido() {
        service.listar(CargaTipo.FACTURACION_PAGOS, CargaOrigen.EXCEL, CargaEstado.COMPLETADA, PageRequest.of(0, 20));
        assertEquals(List.of("FACTURACION_PAGOS", "EXCEL", "COMPLETADA"), bindings.get(0));
        assertEquals(List.of("FACTURACION_PAGOS", "EXCEL", "COMPLETADA", 20, 0L), bindings.get(1));
        assertTrue(sqls.get(0).contains("and tipo = ? and origen = ? and estado = ?"));
    }
    @Test void incidenciasSinFiltrosConservaValidacionDeCarga() {
        UUID id = UUID.randomUUID(); doReturn(null).when(service).obtener(id);
        service.incidencias(id, null, "", "  ", null, null, null, PageRequest.of(0, 50));
        verify(service).obtener(id);
        assertEquals(List.of(id), bindings.get(0));
        assertEquals(List.of(id, 50, 0L), bindings.get(1));
        assertTrue(sqls.stream().noneMatch(sql -> sql.contains("? is null")));
    }
    @Test void incidenciasConFechasEnviaTiposJdbcYTextosComoParametros() {
        UUID id = UUID.randomUUID(); doReturn(null).when(service).obtener(id);
        Instant desde = Instant.parse("2026-11-01T00:00:00Z"), hasta = Instant.parse("2026-11-05T23:59:59Z");
        service.incidencias(id, IncidenciaResultado.ERROR, "150-001", "FILA", "OPERADOR", desde, hasta, PageRequest.of(1, 25));
        var expected = List.of(id, "ERROR", "%150-001%", "%fila%", "%operador%", Timestamp.from(desde), Timestamp.from(hasta));
        assertEquals(expected, bindings.get(0));
        assertEquals(expected, bindings.get(1).subList(0, 7));
        assertTrue(sqls.get(0).contains("created_at >= ? and created_at <= ?"));
        assertFalse(sqls.get(0).contains("150-001"));
    }
}
