package pe.morosos.reporte.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import java.util.*;
import java.time.LocalDate;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;
import static pe.morosos.reporte.service.FacturacionRecaudacionService.*;
import static pe.morosos.reporte.service.MovimientoDetalleService.*;

@EnabledIfSystemProperty(named="cargas.test.postgres",matches="jdbc:postgresql://.+")
class MovimientoDetallePostgresTest {
    @Test void detalleCoincideConGraficoParaTodasLasCombinaciones() throws Exception {
        try(var ds=new SingleConnectionDataSource(System.getProperty("cargas.test.postgres"),"carga_test","",true)) {
            var jdbc=JdbcClient.create(ds);
            jdbc.sql("create temporary table grupo(id uuid,nombre text)").update();
            jdbc.sql("create temporary table inmueble(id uuid,grupo_id uuid,distrito_id uuid,titular text,es_prueba boolean)").update();
            jdbc.sql("create temporary table factura_importada(inmueble_id uuid,cuenta text,numero text,periodo date,codigo_caudalimetro text,plan_pago boolean,pagado boolean,fecha_emision date,fecha_vencimiento date,fecha_pago date,importe_neto numeric,iva numeric,importe_descuentos numeric,importe numeric)").update();
            var grupo=UUID.randomUUID();var inmueble=UUID.randomUUID();var distrito=UUID.randomUUID();
            jdbc.sql("insert into grupo values (?,'Residencial')").param(grupo).update();
            jdbc.sql("insert into inmueble values (?,?,?,'Titular',false)").params(inmueble,grupo,distrito).update();
            var registros=new ArrayList<FacturacionRecaudacionCalculator.Registro>();
            var conceptos=List.of(Concepto.NORMAL,Concepto.PLAN,Concepto.OTROS);var plazos=List.of(Cumplimiento.EN_TERMINO,Cumplimiento.FUERA_TERMINO,Cumplimiento.SIN_FECHA);
            var inicio=LocalDate.of(2026,11,10);var fin=inicio.plusDays(5);
            for(var tipo:conceptos)for(var plazo:plazos) {
                String numero=tipo+"-"+plazo;var periodo=tipo==Concepto.NORMAL?LocalDate.of(2026,10,1):null;
                var venc=plazo==Cumplimiento.SIN_FECHA?null:plazo==Cumplimiento.EN_TERMINO?inicio:inicio.minusDays(1);
                jdbc.sql("insert into factura_importada values (?,?,?,?,?,?,true,?,?,?,?,?,?,?)").params(Arrays.asList(inmueble,"A",numero,periodo,tipo==Concepto.OTROS?"25/2026":null,tipo==Concepto.PLAN,inicio,venc,inicio,new BigDecimal("100"),new BigDecimal("21"),new BigDecimal("10"),new BigDecimal("120"))).update();
                registros.add(new FacturacionRecaudacionCalculator.Registro("A",grupo,"Residencial",periodo,tipo==Concepto.PLAN,true,inicio,new BigDecimal("111"),new BigDecimal("120"),BigDecimal.TEN,null,numero,inicio,venc));
            }
            for(int t=0;t<8;t++)for(int p=0;p<8;p++) {
                var tipos=new HashSet<Concepto>();var cumplimiento=new HashSet<Cumplimiento>();
                for(int i=0;i<3;i++){if((t&(1<<i))!=0)tipos.add(conceptos.get(i));if((p&(1<<i))!=0)cumplimiento.add(plazos.get(i));}
                var report=new FacturacionRecaudacionCalculator().calcular(registros,inicio,fin,Tipo.TODOS,tipos,cumplimiento);
                var service=new MovimientoDetalleService(jdbc);
                var bills=service.obtener(inicio.toString(),fin.toString(),"2026-11",Movimiento.FACTURACION,grupo,distrito,tipos,cumplimiento);
                var paid=service.obtener(inicio.toString(),fin.toString(),"2026-11",Movimiento.RECAUDACION,grupo,distrito,tipos,cumplimiento);
                assertEquals(0,report.totales().facturado().compareTo(bills.total()));assertEquals(report.totales().conceptosEmitidos(),bills.filas().size());
                assertEquals(0,report.totales().recaudado().compareTo(paid.total()));assertEquals(report.totales().conceptosPagados(),paid.filas().size());
                assertEquals(report.totales().cuentasPagaron(),paid.cuentas());
            }
        }
    }
}
