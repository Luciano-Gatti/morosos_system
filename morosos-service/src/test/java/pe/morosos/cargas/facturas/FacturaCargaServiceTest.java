package pe.morosos.cargas.facturas;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import java.sql.ResultSet;
import java.util.*;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import pe.morosos.cargas.model.IncidenciaResultado;
import pe.morosos.cargas.service.CargaRegistroService;
import pe.morosos.cargas.service.CargaRegistroService.CargaMetricas;
import pe.morosos.cargas.facturas.FacturaExcelParser.Factura;

class FacturaCargaServiceTest {
    private final JdbcClient jdbc=mock(JdbcClient.class);
    private final CargaRegistroService cargas=mock(CargaRegistroService.class);
    private final FacturaExcelParser parser=new FacturaExcelParser();
    private final UUID carga=UUID.randomUUID();
    private final List<String> writes=new ArrayList<>();
    private final FacturaCargaService service=new FacturaCargaService(jdbc,parser,cargas,new ObjectMapper());

    @SuppressWarnings({"unchecked","rawtypes"})
    private void prepare(boolean prueba, Factura anterior) throws Exception {
        when(jdbc.sql(anyString())).thenAnswer(inv -> {
            String sql=inv.getArgument(0);
            var spec=mock(JdbcClient.StatementSpec.class, RETURNS_SELF);
            when(spec.update()).thenAnswer(x -> {
                if (sql.contains("insert into factura_importada") || sql.contains("insert into factura_carga_detalle")) writes.add(sql);
                return 1;
            });
            when(spec.query(any(RowMapper.class))).thenAnswer(x->{
                RowMapper rm=x.getArgument(0);
                var result=mock(JdbcClient.MappedQuerySpec.class);
                List<Object> rows=new ArrayList<>();
                if(sql.contains("from inmueble")) {
                    var rs=mock(ResultSet.class);
                    when(rs.getString("cuenta")).thenReturn("150-000001-000");
                    when(rs.getObject("id",UUID.class)).thenReturn(UUID.randomUUID());
                    when(rs.getBoolean("es_prueba")).thenReturn(prueba);
                    rows.add(rm.mapRow(rs,0));
                } else if(sql.contains("from factura_importada") && anterior!=null) {
                    var rs=mock(ResultSet.class);
                    when(rs.getString("cuenta")).thenReturn(anterior.cuenta());
                    when(rs.getString("numero")).thenReturn(anterior.numero());
                    when(rs.getObject("periodo",java.time.LocalDate.class)).thenReturn(anterior.periodo());
                    when(rs.getBoolean("plan_pago")).thenReturn(anterior.planPago());
                    when(rs.getBoolean("pagado")).thenReturn(anterior.pagado());
                    when(rs.getObject("fecha_pago",java.time.LocalDate.class)).thenReturn(anterior.fechaPago());
                    when(rs.getBigDecimal("importe")).thenReturn(anterior.importe());
                    when(rs.getBigDecimal("importe_neto")).thenReturn(anterior.neto());
                    when(rs.getBigDecimal("iva")).thenReturn(anterior.iva());
                    when(rs.getBigDecimal("importe_descuentos")).thenReturn(anterior.descuentos());
                    rows.add(rm.mapRow(rs,0));
                }
                when(result.list()).thenReturn(rows);return result;
            });
            return spec;
        });
    }
    private CargaMetricas metrics() {
        var capture=org.mockito.ArgumentCaptor.forClass(CargaMetricas.class);
        verify(cargas).finalizar(eq(carga),capture.capture());return capture.getValue();
    }
    @Test void enriqueceFacturaPagadaAnteriorSinDuplicarPago() throws Exception {
        var fila=FacturaExcelParserTest.fila("9/2023","Pagado","24-11-2023","100");
        prepare(false,parser.convertir(fila));
        var datos=new HashMap<>(fila.datos());
        datos.put("importe neto","80");datos.put("iva","16.80");datos.put("importe descuentos","0");
        service.importar(carga,List.of(new FacturaExcelParser.Fila(2,datos)));
        var m=metrics();assertEquals(1,m.actualizados());assertEquals(0,m.creados());assertEquals(0,m.conflictos());
    }
    @Test void conservaBasesSiSeReimportaFormatoAnterior() throws Exception {
        var fila=FacturaExcelParserTest.fila("9/2023","Pagado","24-11-2023","100");
        var datos=new HashMap<>(fila.datos());
        datos.put("importe neto","80");datos.put("iva","16.80");datos.put("importe descuentos","0");
        prepare(false,parser.convertir(new FacturaExcelParser.Fila(2,datos)));
        service.importar(carga,List.of(fila));
        assertEquals(1,metrics().sinCambios());
    }
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings={"Jubilados","Discapacidad","Tarifa social"})
    void conservaBeneficioDeEmisionAlRegistrarPagoTrasVencimiento(String beneficio) {
        var original = conBeneficio(beneficio,"20","No pagado","","100");
        var pagada = conBeneficio("-","0","Pagado","24-11-2023","85");
        var conciliada = FacturaCargaService.conciliar(original,pagada);
        assertEquals(beneficio,conciliada.beneficio());
        assertEquals(new BigDecimal("20.00"),conciliada.descuentos());
        assertEquals(new BigDecimal("80.00"),conciliada.facturado());
        assertEquals(new BigDecimal("85.00"),conciliada.importe());
        assertTrue(conciliada.pagado());
        assertEquals(conciliada,FacturaCargaService.conciliar(conciliada,pagada));
        // Importing an older issue snapshot after a paid snapshot must preserve the payment.
        assertEquals(conciliada,FacturaCargaService.conciliar(pagada,original));
    }

    @Test void dosDescuentosPositivosDistintosRequierenRevision() {
        var inicial = conBeneficio("Tarifa social","20","No pagado","","80");
        var distinta = conBeneficio("Tarifa social","30","Pagado","24-11-2023","70");
        assertThrows(IllegalArgumentException.class,()->FacturaCargaService.conciliar(inicial,distinta));
    }

    private Factura conBeneficio(String beneficio, String descuento, String estado, String fecha, String cobro) {
        var fila = FacturaExcelParserTest.fila("9/2023",estado,fecha,cobro);
        var datos = new HashMap<>(fila.datos());
        datos.put("importe neto","100"); datos.put("iva","0");
        datos.put("descuentos",beneficio); datos.put("importe descuentos",descuento);
        return parser.convertir(new FacturaExcelParser.Fila(2,datos));
    }

    @Test void reimportacionNoDuplicaPago() throws Exception {
        var fila=FacturaExcelParserTest.fila("9/2023","Pagado","24-11-2023","8688,34");
        prepare(false,parser.convertir(fila)); service.importar(carga,List.of(fila));
        assertEquals(1,metrics().sinCambios());
        assertEquals(1,writes.size());assertTrue(writes.get(0).contains("factura_carga_detalle"));
    }
    @Test void registraTransicionDePendienteAPagada() throws Exception {
        prepare(false,parser.convertir(FacturaExcelParserTest.fila("9/2023","No pagado","","0")));
        service.importar(carga,List.of(FacturaExcelParserTest.fila("9/2023","Pagado","24-11-2023","8688,34")));
        var m=metrics();assertEquals(1,m.actualizados());assertEquals(new BigDecimal("8688.34"),m.montoTotal());
        assertEquals(2,writes.size());
    }
    @Test void noRevierteUnPagoConArchivoViejo() throws Exception {
        prepare(false,parser.convertir(FacturaExcelParserTest.fila("9/2023","Pagado","24-11-2023","100")));
        service.importar(carga,List.of(FacturaExcelParserTest.fila("9/2023","No pagado","","0")));
        assertEquals(1,metrics().conflictos());assertTrue(writes.isEmpty());
    }
    @Test void cuentaMarcadaComoPruebaSeOmiteAntesDeValidarDatos() throws Exception {
        prepare(true,null);
        service.importar(carga,List.of(FacturaExcelParserTest.fila("20/2023","Pagado","","mal")));
        assertEquals(1,metrics().ignorados());assertTrue(writes.isEmpty());
        verify(cargas).incidencia(eq(carga),eq(2),eq("150-000001-000"),eq(IncidenciaResultado.IGNORADO),eq("CUENTA_PRUEBA"),anyString(),any());
    }
    @Test void rechazaTodasLasFilasDeFacturaDuplicada() throws Exception {
        prepare(false,null);
        var fila=FacturaExcelParserTest.fila("9/2023","Pagado","24-11-2023","100");
        service.importar(carga,List.of(fila,new FacturaExcelParser.Fila(3,fila.datos())));
        assertEquals(2,metrics().conflictos());assertTrue(writes.isEmpty());
    }
    @Test void pendienteNoAportaAlImporteCobrado() throws Exception {
        prepare(false,null);
        service.importar(carga,List.of(FacturaExcelParserTest.fila("9/2023","No pagado","","100")));
        var m=metrics();assertEquals(1,m.creados());assertEquals(0,m.montoTotal().signum());
    }
    @Test void completaFechasSinBorrarlasEnUnaCargaAntigua() {
        var original=new Factura("A","1",java.time.LocalDate.of(2026,9,1),false,true,java.time.LocalDate.of(2026,10,31),BigDecimal.TEN,BigDecimal.TEN,BigDecimal.ZERO,BigDecimal.ZERO,null,null);
        var nueva=new Factura(original.cuenta(),original.numero(),original.periodo(),false,true,original.fechaPago(),original.importe(),original.neto(),original.iva(),original.descuentos(),null,null,java.time.LocalDate.of(2026,10,21),java.time.LocalDate.of(2026,10,31));
        var completa=FacturaCargaService.conciliar(original,nueva);
        assertEquals(nueva,completa);
        assertEquals(completa,FacturaCargaService.conciliar(completa,original));
        var cambios=ComparacionFactura.comparar(original,nueva,completa,false);
        assertEquals(2,cambios.size());
        assertTrue(cambios.stream().anyMatch(c->c.campo().equals("Fecha de emisión")));
    }
}
