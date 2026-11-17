package pe.morosos.reporte.service;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import java.util.*;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.core.RowMapper;
import pe.morosos.common.exception.ValidationException;
class FacturacionRecaudacionServiceTest {
    @Test @SuppressWarnings({"unchecked","rawtypes"})
    void seleccionMultipleIncluyeEmisionesEspecialesAunqueNoEstenPagadas() {
        var jdbc=mock(JdbcClient.class);var spec=mock(JdbcClient.StatementSpec.class,RETURNS_SELF);
        var rows=mock(JdbcClient.MappedQuerySpec.class);
        when(jdbc.sql(anyString())).thenReturn(spec);when(spec.query(any(RowMapper.class))).thenReturn(rows);when(rows.list()).thenReturn(List.of());
        var inicio=LocalDate.of(2026,11,10);var fin=LocalDate.of(2026,11,20);
        new FacturacionRecaudacionService(jdbc).obtener(inicio.toString(),fin.toString(),null,null,FacturacionRecaudacionService.Tipo.TODOS,
            Set.of(FacturacionRecaudacionService.Concepto.PLAN),Set.of(FacturacionRecaudacionService.Cumplimiento.EN_TERMINO));
        verify(spec).params(List.of(LocalDate.of(2026,10,1),LocalDate.of(2026,11,1),inicio,fin.plusDays(1),inicio,fin.plusDays(1)));
        verify(jdbc).sql(argThat(sql->sql.contains("or ((f.plan_pago=true or f.periodo is null) and f.fecha_emision >= ? and f.fecha_emision < ?)")));
    }
    @Test @SuppressWarnings({"unchecked","rawtypes"})
    void consultaPeriodosDesplazadosYFechasRealesConFiltros() {
        var jdbc=mock(JdbcClient.class);var spec=mock(JdbcClient.StatementSpec.class,RETURNS_SELF);
        var rows=mock(JdbcClient.MappedQuerySpec.class);
        when(jdbc.sql(anyString())).thenReturn(spec);when(spec.query(any(RowMapper.class))).thenReturn(rows);when(rows.list()).thenReturn(List.of());
        UUID grupo=UUID.randomUUID(), distrito=UUID.randomUUID();
        var r=new FacturacionRecaudacionService(jdbc).obtener("2026-10","2026-12",grupo,distrito,FacturacionRecaudacionService.Tipo.NORMAL);
        verify(spec).params(List.of(LocalDate.of(2026,9,1),LocalDate.of(2026,12,1),LocalDate.of(2026,10,1),LocalDate.of(2027,1,1),grupo,distrito));
        verify(jdbc).sql(argThat(sql->sql.contains("i.es_prueba=false") && sql.contains("and i.grupo_id=?") && sql.contains("and i.distrito_id=?")));
        assertEquals(3,r.reporte().meses().size());
    }
    @Test void rechazaRangosInvalidosAntesDeConsultar() {
        var jdbc=mock(JdbcClient.class);var service=new FacturacionRecaudacionService(jdbc);
        assertThrows(ValidationException.class,()->service.obtener("2026-13","2026-12",null,null,FacturacionRecaudacionService.Tipo.TODOS));
        assertThrows(ValidationException.class,()->service.obtener("2026-12","2026-10",null,null,FacturacionRecaudacionService.Tipo.TODOS));
        assertThrows(ValidationException.class,()->service.obtener("2000-01","2026-12",null,null,FacturacionRecaudacionService.Tipo.TODOS));
        verifyNoInteractions(jdbc);
    }
    @Test @SuppressWarnings({"unchecked","rawtypes"})
    void consultaDiasInclusivosSinRecortarLaEmisionMensual() {
        var jdbc=mock(JdbcClient.class);var spec=mock(JdbcClient.StatementSpec.class,RETURNS_SELF);
        var rows=mock(JdbcClient.MappedQuerySpec.class);
        when(jdbc.sql(anyString())).thenReturn(spec);when(spec.query(any(RowMapper.class))).thenReturn(rows);when(rows.list()).thenReturn(List.of());
        var r=new FacturacionRecaudacionService(jdbc).obtener("2026-10-10","2026-10-16",null,null,FacturacionRecaudacionService.Tipo.TODOS);
        verify(spec).params(List.of(LocalDate.of(2026,9,1),LocalDate.of(2026,10,1),LocalDate.of(2026,10,10),LocalDate.of(2026,10,17)));
        assertEquals("2026-10-10",r.reporte().desde());
        assertEquals(7,r.reporte().dias().size());
    }
    @Test @SuppressWarnings({"unchecked","rawtypes"})
    void desdeInicioUsaElPrimerMovimientoDisponible() {
        var jdbc=mock(JdbcClient.class);var spec=mock(JdbcClient.StatementSpec.class,RETURNS_SELF);
        var rows=mock(JdbcClient.MappedQuerySpec.class);
        when(jdbc.sql(anyString())).thenReturn(spec);when(spec.query(any(RowMapper.class))).thenReturn(rows);
        var fila=new FacturacionRecaudacionCalculator.Registro("A",UUID.randomUUID(),"Residencial",LocalDate.of(2002,9,1),false,true,LocalDate.of(2026,10,10),java.math.BigDecimal.TEN,java.math.BigDecimal.TEN,null,null);
        when(rows.list()).thenReturn(List.of(fila),List.of(),List.of());
        var r=new FacturacionRecaudacionService(jdbc).obtener("INICIO","2026-10-16",null,null,FacturacionRecaudacionService.Tipo.TODOS);
        assertEquals("2002-10-01",r.reporte().desde());
        assertEquals(289,r.reporte().meses().size());
        assertEquals(1,r.reporte().totales().conceptosPagados());
    }
}
