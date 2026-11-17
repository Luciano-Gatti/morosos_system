package pe.morosos.reporte.service;

import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static pe.morosos.reporte.service.FacturacionRecaudacionService.*;
import pe.morosos.reporte.service.FacturacionRecaudacionCalculator.Registro;

class ReporteSeleccionMultipleTest {
    @Test void combinaTodosLosTiposYPlazosSinModificarLaFacturacionPorCumplimiento() {
        var inicio=LocalDate.of(2026,11,1); var fin=inicio.plusMonths(1).minusDays(1);
        var filas=new ArrayList<Registro>(); var grupo=UUID.randomUUID();
        for(var concepto:List.of(Concepto.NORMAL,Concepto.PLAN,Concepto.OTROS)) {
            for(var plazo:List.of(Cumplimiento.EN_TERMINO,Cumplimiento.FUERA_TERMINO,Cumplimiento.SIN_FECHA)) {
                filas.add(new Registro("A",grupo,"R",concepto==Concepto.NORMAL?inicio.minusMonths(1):null,
                    concepto==Concepto.PLAN,true,inicio.plusDays(10),BigDecimal.TEN,BigDecimal.TEN,BigDecimal.ZERO,null,
                    concepto+"-"+plazo,inicio,plazo==Cumplimiento.SIN_FECHA?null:inicio.plusDays(plazo==Cumplimiento.EN_TERMINO?10:9)));
            }
        }
        var calculator=new FacturacionRecaudacionCalculator();
        var tipos=List.of(Concepto.NORMAL,Concepto.PLAN,Concepto.OTROS);
        var plazos=List.of(Cumplimiento.EN_TERMINO,Cumplimiento.FUERA_TERMINO,Cumplimiento.SIN_FECHA);
        for(int t=0;t<8;t++) for(int p=0;p<8;p++) {
            var seleccion=new HashSet<Concepto>();var cumplimiento=new HashSet<Cumplimiento>();
            for(int i=0;i<3;i++){if((t&(1<<i))!=0)seleccion.add(tipos.get(i));if((p&(1<<i))!=0)cumplimiento.add(plazos.get(i));}
            var r=calculator.calcular(filas,inicio,fin,Tipo.TODOS,seleccion,cumplimiento);
            assertEquals(BigDecimal.valueOf(seleccion.size()*30),r.totales().facturado());
            assertEquals(BigDecimal.valueOf(seleccion.size()*cumplimiento.size()*10),r.totales().recaudado());
            assertEquals(seleccion.isEmpty()||cumplimiento.isEmpty()?0:1,r.totales().cuentasPagaron());
            assertEquals(seleccion.contains(Concepto.PLAN)?BigDecimal.valueOf(30):BigDecimal.ZERO,r.totales().facturadoPlanes());
        }
    }
    @Test void especialesRequierenEmisionYRespetanDiasNormalesConservanPeriodo() {
        var inicio=LocalDate.of(2026,11,10);var fin=inicio.plusDays(1);var grupo=UUID.randomUUID();
        var filas=List.of(
            new Registro("A",grupo,"R",inicio.minusMonths(1).withDayOfMonth(1),false,false,null,BigDecimal.TEN,BigDecimal.ZERO,null,null,"1",inicio.minusMonths(1),null),
            new Registro("A",grupo,"R",null,true,false,null,BigDecimal.TEN,BigDecimal.ZERO,null,null,"2",inicio,null),
            new Registro("A",grupo,"R",null,false,false,null,BigDecimal.TEN,BigDecimal.ZERO,null,null,"3",fin,null),
            new Registro("A",grupo,"R",null,true,false,null,BigDecimal.TEN,BigDecimal.ZERO,null,null,"4",inicio.minusDays(1),null),
            new Registro("A",grupo,"R",null,false,false,null,BigDecimal.TEN,BigDecimal.ZERO,null,null,"5",null,null));
        var r=new FacturacionRecaudacionCalculator().calcular(filas,inicio,fin,Tipo.TODOS,Set.of(Concepto.NORMAL,Concepto.PLAN,Concepto.OTROS),Set.of());
        assertEquals(BigDecimal.valueOf(30),r.totales().facturado());
        assertEquals(3,r.totales().conceptosEmitidos());
        assertEquals(BigDecimal.ZERO,r.totales().recaudado());
    }
}
