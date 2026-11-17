package pe.morosos.reporte.service;
import static org.junit.jupiter.api.Assertions.*;
import java.util.*;
import java.time.*;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import pe.morosos.reporte.service.FacturacionRecaudacionCalculator.Registro;
class FacturacionRecaudacionCalculatorTest {
    final FacturacionRecaudacionCalculator calculator=new FacturacionRecaudacionCalculator();
    final UUID grupo=UUID.randomUUID();
    Registro normal(String cuenta, String periodo, String pago) {
        return new Registro(cuenta,grupo,"Residencial",LocalDate.parse(periodo),false,pago!=null,
            pago==null?null:LocalDate.parse(pago),new BigDecimal("100"),new BigDecimal("110"),null,null);
    }
    @Test void emisionMesSiguienteYCobroEnFechaReal() {
        var r=calculator.calcular(List.of(normal("A","2026-09-01","2026-11-12")),YearMonth.of(2026,9),YearMonth.of(2026,11));
        assertEquals(BigDecimal.ZERO,r.meses().get(0).indicadores().facturado());
        assertEquals(new BigDecimal("100"),r.meses().get(1).indicadores().facturado());
        assertEquals(new BigDecimal("110"),r.meses().get(2).indicadores().recaudado());
    }
    @Test void cuentasUnicosNoSeSumanEntreMesesNiTipos() {
        var plan=new Registro("A",grupo,"Residencial",null,true,true,LocalDate.of(2027,1,31),null,new BigDecimal("50"),null,null);
        var r=calculator.calcular(List.of(normal("A","2026-11-01","2026-12-01"),normal("A","2026-12-01","2027-01-01"),plan),YearMonth.of(2026,12),YearMonth.of(2027,1));
        assertEquals(3,r.totales().conceptosPagados());assertEquals(1,r.totales().cuentasPagaron());
        assertEquals(2,r.totales().conceptosEmitidos());assertEquals(new BigDecimal("50"),r.totales().recaudadoPlanes());
        assertEquals(1,r.totales().cuentasNormales());assertEquals(1,r.totales().cuentasPlanes());
        assertEquals(1,r.meses().get(1).indicadores().conceptosEmitidos());
    }
    @Test void refinanciacionConservaEmisionYCobraSoloLaCuotaDelPlan() {
        var original = new Registro("A", grupo, "Residencial", LocalDate.of(2026,9,1), false,
                false, null, new BigDecimal("1160.00"), BigDecimal.ZERO,null,null);
        var cuota = new Registro("A", grupo, "Residencial", null, true,
                true, LocalDate.of(2026,11,3), null, new BigDecimal("650.00"),null,null);
        var sinCobro = new Registro("B", grupo, "Residencial", LocalDate.of(2025,1,1), false,
                true, LocalDate.of(2026,11,3), BigDecimal.TEN, BigDecimal.ZERO,null,null);
        var reporte = calculator.calcular(List.of(original, cuota, sinCobro), YearMonth.of(2026,10), YearMonth.of(2026,11));
        assertEquals(new BigDecimal("1160.00"), reporte.meses().get(0).indicadores().facturado());
        assertEquals(BigDecimal.ZERO, reporte.meses().get(1).indicadores().facturado());
        assertEquals(new BigDecimal("650.00"), reporte.totales().recaudadoPlanes());
        assertEquals(1, reporte.totales().conceptosPagados());
        assertEquals(1, reporte.totales().cuentasPagaron());
    }
    @Test void muestraSoloDescuentosDocumentadosEnElMesDeEmision() {
        var septiembre = LocalDate.of(2026,9,1);
        var pago = LocalDate.of(2026,11,8);
        var confirmada = new Registro("A", grupo, "Residencial", septiembre, false, true, pago,
                new BigDecimal("80"), new BigDecimal("82"), new BigDecimal("20"), "Jubilados");
        var revisar = new Registro("B", grupo, "Residencial", septiembre, false, true, pago,
                new BigDecimal("100"), new BigDecimal("75"), BigDecimal.ZERO, null);
        var r = calculator.calcular(List.of(confirmada, revisar), YearMonth.of(2026,10), YearMonth.of(2026,11));
        assertEquals(new BigDecimal("20"), r.totales().descuentosDocumentados());
        assertEquals(1, r.totales().descuentosPorBeneficio().get("Jubilados").conceptos());
        assertEquals(1, r.totales().descuentosARevisar());
        assertEquals(new BigDecimal("180"), r.totales().facturado());
        assertEquals(new BigDecimal("157"), r.totales().recaudado());
        assertEquals(BigDecimal.ZERO, r.meses().get(1).indicadores().descuentosDocumentados());
    }
    @Test void beneficioDeCuentaSinImporteQuedaPendienteEnCadaEmision() {
        var facturas = List.of(
                new Registro("A", grupo, "Residencial", LocalDate.of(2026,9,1), false, false, null,
                        BigDecimal.TEN, BigDecimal.ZERO, BigDecimal.ZERO, "Tarifa social"),
                new Registro("A", grupo, "Residencial", LocalDate.of(2026,10,1), false, false, null,
                        BigDecimal.TEN, BigDecimal.ZERO, BigDecimal.ZERO, "Tarifa social"));
        var r = calculator.calcular(facturas, YearMonth.of(2026,10), YearMonth.of(2026,11));
        var beneficio = r.totales().descuentosPorBeneficio().get("Tarifa social");
        assertEquals(2, beneficio.sinImporte());
        assertEquals(0, beneficio.conceptos());
        assertEquals(BigDecimal.ZERO, r.totales().descuentosDocumentados());
    }
    @Test void cuotaCaudalimetroCuentaPorPagoSinAsignarleMesDeEmision() {
        var cuota = new Registro("A", grupo, "Residencial", null, false, true, LocalDate.of(2026,11,2),
                new BigDecimal("120"), new BigDecimal("125"), BigDecimal.ZERO, null);
        var r = calculator.calcular(List.of(cuota), YearMonth.of(2026,11), YearMonth.of(2026,11));
        assertEquals(new BigDecimal("125"), r.totales().recaudadoCaudalimetros());
        assertEquals(r.totales().recaudadoCaudalimetros(), r.totales().recaudado());
        assertEquals(BigDecimal.ZERO,r.totales().recaudadoNormal());
        assertEquals(BigDecimal.ZERO,r.totales().recaudadoPlanes());
        assertEquals(1,r.totales().conceptosCaudalimetroPagados());
        assertEquals(1,r.totales().cuentasCaudalimetros());
        assertEquals(0,r.totales().conceptosEmitidos());
    }
    @Test void noInventaImporteFacturadoAusenteNiCuentaPagosFueraDeRango() {
        var fila=new Registro("A",grupo,"Residencial",LocalDate.of(2026,9,1),false,true,LocalDate.of(2026,11,1),null,BigDecimal.TEN,null,null);
        var r=calculator.calcular(List.of(fila),YearMonth.of(2026,10),YearMonth.of(2026,10));
        assertNull(r.totales().facturado());assertEquals(1,r.totales().conceptosSinImporte());
        assertEquals(0,r.totales().conceptosPagados());assertEquals(BigDecimal.ZERO,r.totales().recaudado());
    }
    @Test void rangoDiarioIncluyeAmbosExtremosYConservaLaEmisionMensual() {
        var r=calculator.calcular(List.of(
            normal("A","2026-09-01","2026-10-09"),
            normal("B","2026-09-01","2026-10-10"),
            normal("B","2026-09-01","2026-10-16"),
            normal("C","2026-09-01","2026-10-17")),LocalDate.of(2026,10,10),LocalDate.of(2026,10,16));
        assertEquals(new BigDecimal("220"),r.totales().recaudado());
        assertEquals(1,r.totales().cuentasPagaron());
        assertEquals(4,r.totales().conceptosEmitidos());
        assertEquals(7,r.dias().size());
        assertEquals(new BigDecimal("110"),r.dias().get(0).indicadores().recaudado());
        assertEquals(new BigDecimal("110"),r.dias().get(6).indicadores().recaudado());
        assertEquals(BigDecimal.ZERO,r.dias().get(1).indicadores().recaudado());
    }
    @Test void usaPeriodoMasUnMesYConservaFechasParaClasificarPagos() {
        var emision=LocalDate.of(2026,11,10); var venc=LocalDate.of(2026,11,20);
        var filas=List.of(
            new Registro("A",grupo,"Residencial",LocalDate.of(2026,9,1),false,true,venc,BigDecimal.TEN,BigDecimal.TEN,null,null,"1",emision,venc),
            new Registro("A",grupo,"Residencial",null,true,true,venc.plusDays(1),BigDecimal.TEN,BigDecimal.TEN,null,null,"2",emision,venc),
            new Registro("B",grupo,"Residencial",null,false,true,venc.minusDays(1),BigDecimal.TEN,BigDecimal.TEN,null,null,"3",emision,venc),
            new Registro("C",grupo,"Residencial",LocalDate.of(2026,9,1),false,true,venc,BigDecimal.TEN,BigDecimal.TEN,null,null,"4",emision,null));
        var r=calculator.calcular(filas,LocalDate.of(2026,11,1),LocalDate.of(2026,11,30));
        assertEquals(0,r.totales().conceptosEmitidos());
        assertEquals(0,r.emisionesEstimadas());
        var pagos=r.pagos().stream().collect(java.util.stream.Collectors.toMap(FacturacionRecaudacionCalculator.Pago::numero,p->p));
        assertEquals("EN_TERMINO",pagos.get("1").cumplimiento());
        assertEquals("FUERA_TERMINO",pagos.get("2").cumplimiento());
        assertEquals(1L,pagos.get("2").diasAtraso());
        assertEquals("PLAN",pagos.get("2").tipo());
        assertEquals("EN_TERMINO",pagos.get("3").cumplimiento());
        assertEquals("CAUDALIMETRO",pagos.get("3").tipo());
        assertEquals("SIN_FECHA",pagos.get("4").cumplimiento());
        assertNull(pagos.get("4").diasAtraso());
        assertEquals(0,calculator.calcular(filas,LocalDate.of(2026,11,11),LocalDate.of(2026,11,30)).totales().conceptosEmitidos());
        assertEquals(2,calculator.calcular(filas,YearMonth.of(2026,10),YearMonth.of(2026,10)).totales().conceptosEmitidos());
    }
    @Test void filtrarCobrosNoModificaEmisionesNiDescuentos() {
        var emision=LocalDate.of(2026,11,1); var venc=LocalDate.of(2026,11,10);
        var filas=List.of(
            new Registro("A",grupo,"R",LocalDate.of(2026,10,1),false,true,venc,new BigDecimal("90"),new BigDecimal("90"),BigDecimal.TEN,"Jubilados","1",emision,venc),
            new Registro("B",grupo,"R",LocalDate.of(2026,10,1),false,true,venc.plusDays(1),new BigDecimal("100"),new BigDecimal("110"),BigDecimal.ZERO,null,"2",emision,venc),
            new Registro("C",grupo,"R",LocalDate.of(2026,10,1),false,false,null,new BigDecimal("100"),new BigDecimal("100"),BigDecimal.ZERO,null,"3",emision,venc),
            new Registro("D",grupo,"R",null,true,true,venc,null,new BigDecimal("30"),null,null,"4",emision,venc),
            new Registro("E",grupo,"R",null,false,true,venc,null,new BigDecimal("20"),null,null,"5",emision,venc));
        for(var tipo:FacturacionRecaudacionService.Tipo.values()) {
            var r=calculator.calcular(filas,emision,LocalDate.of(2026,11,30),tipo);
            assertEquals(new BigDecimal("290"),r.totales().facturado(),tipo.name());
            assertEquals(3,r.totales().conceptosEmitidos());
            assertEquals(BigDecimal.TEN,r.totales().descuentosDocumentados());
            assertEquals(r.totales().facturado(),r.meses().get(0).indicadores().facturado());
            assertEquals(r.totales().facturado(),r.grupos().get(0).indicadores().facturado());
            var expected=switch(tipo) {case TODOS->"250";case NORMAL->"200";case VIGENTE->"90";case VENCIDO->"110";case PLAN->"30";case OTROS,CAUDALIMETRO->"20";};
            assertEquals(new BigDecimal(expected),r.totales().recaudado(),tipo.name());
        }
    }
    @Test void emisionAnticipadaNoMueveLaFacturacionDelMesSiguienteAlPeriodo() {
        for (var periodo : List.of(LocalDate.of(2023,12,1),LocalDate.of(2024,5,1),LocalDate.of(2024,8,1),LocalDate.of(2024,12,1),LocalDate.of(2025,6,1))) {
            var mes=YearMonth.from(periodo).plusMonths(1);
            var fila=new Registro("A",grupo,"R",periodo,false,true,mes.atDay(10),BigDecimal.TEN,BigDecimal.TEN,null,null,"1",periodo.withDayOfMonth(28),mes.atDay(15));
            assertEquals(BigDecimal.ZERO,calculator.calcular(List.of(fila),YearMonth.from(periodo),YearMonth.from(periodo)).totales().facturado());
            var r=calculator.calcular(List.of(fila),mes.atDay(8),mes.atDay(12));
            assertEquals(BigDecimal.TEN,r.totales().facturado());
            assertEquals("EN_TERMINO",r.pagos().get(0).cumplimiento());
            assertEquals(periodo.withDayOfMonth(28),r.pagos().get(0).fechaEmision());
        }
    }
}
