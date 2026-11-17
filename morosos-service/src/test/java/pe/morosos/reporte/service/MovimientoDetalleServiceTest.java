package pe.morosos.reporte.service;

import org.junit.jupiter.api.Test;
import java.util.*;
import java.time.LocalDate;
import static org.junit.jupiter.api.Assertions.*;
import static pe.morosos.reporte.service.FacturacionRecaudacionService.*;
import static pe.morosos.reporte.service.MovimientoDetalleService.*;
import pe.morosos.common.exception.ValidationException;

class MovimientoDetalleServiceTest {
    @Test void facturacionConservaMesCompletoNormalYNoFiltraPorCumplimiento() {
        var q=consulta("2026-11-10","2026-11-15","2026-11",Movimiento.FACTURACION,null,null,Set.of(Concepto.NORMAL,Concepto.PLAN),Set.of(Cumplimiento.NINGUNO));
        assertEquals(List.of(LocalDate.of(2026,10,1),LocalDate.of(2026,11,1),LocalDate.of(2026,11,10),LocalDate.of(2026,11,16)),q.params().subList(0,4));
        assertFalse(q.params().contains("NINGUNO"));
        assertTrue(q.sql().contains("i.es_prueba=false"));
    }
    @Test void cobrosUsanDiasYFiltrosDeCuentaTipoYCumplimiento() {
        var grupo=UUID.randomUUID();var distrito=UUID.randomUUID();
        var q=consulta("2026-11-10","2026-11-15","2026-11",Movimiento.RECAUDACION,grupo,distrito,Set.of(Concepto.PLAN),Set.of(Cumplimiento.FUERA_TERMINO));
        assertEquals(List.of(LocalDate.of(2026,11,10),LocalDate.of(2026,11,16),grupo,distrito,"PLAN","FUERA_TERMINO"),q.params());
        assertTrue(q.sql().contains("f.pagado=true and f.importe>0"));
        assertTrue(q.sql().contains("f.fecha_pago>f.fecha_vencimiento"));
    }
    @Test void rechazaMesAjenoAlReporteYRespetaSeleccionVacia() {
        assertThrows(ValidationException.class,()->consulta("2026-11-01","2026-11-30","2026-10",Movimiento.FACTURACION,null,null,null,null));
        assertTrue(consulta("INICIO","2026-11-30","2026-11",Movimiento.RECAUDACION,null,null,Set.of(),Set.of()).sql().contains("and false"));
    }
}
