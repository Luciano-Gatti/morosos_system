package pe.morosos.cargas.facturas;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayOutputStream;
import java.nio.file.*;
import java.util.UUID;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.mock.web.MockMultipartFile;
import pe.morosos.cargas.model.CargaEstado;
import pe.morosos.cargas.service.CargaRegistroService;
import pe.morosos.security.TechnicalActorProvider;

@EnabledIfSystemProperty(named="cargas.test.postgres", matches="jdbc:postgresql://.+")
class CargaPostgresTest {
    @Test void importaElExcelYRegistraFacturasEIncidencias() throws Exception {
        String url = System.getProperty("cargas.test.postgres");
        String schema = "prueba_carga_" + UUID.randomUUID().toString().replace("-", "");
        try (var ds = new SingleConnectionDataSource(url, "carga_test", "", true)) {
            JdbcClient jdbc = JdbcClient.create(ds);
            jdbc.sql("create schema " + schema).update();
            try {
                Flyway.configure().dataSource(ds).defaultSchema(schema).schemas(schema).load().migrate();
                ds.getConnection().setSchema(schema);
                ds.getConnection().setAutoCommit(false);
                var parser = new FacturaExcelParser();
                var file = archivo();
                var filas = parser.leer(file);
                UUID grupo = UUID.randomUUID(), distrito = UUID.randomUUID();
                for (var tabla : new String[]{"grupo","distrito"}) {
                    jdbc.sql("insert into " + tabla + "(id,codigo,nombre,created_by,created_at,updated_by,updated_at) values (?,'TEST','TEST','test',now(),'test',now())")
                        .param(tabla.equals("grupo") ? grupo : distrito).update();
                }
                for (String cuenta : filas.stream().map(f -> f.datos().get("inmueble")).distinct().toList()) {
                    jdbc.sql("insert into inmueble(id,cuenta,titular,direccion,grupo_id,distrito_id,es_prueba,created_by,created_at,updated_by,updated_at) values (?,?,'Test','Test',?,?,?,'test',now(),'test',now())")
                        .params(UUID.randomUUID(), cuenta, grupo, distrito, cuenta.equals("150-999999-999")).update();
                }
                var actor = mock(TechnicalActorProvider.class);
                when(actor.getActorName()).thenReturn("test");
                var mapper = new ObjectMapper();
                var cargas = new CargaRegistroService(jdbc, actor, mapper);
                var api = new FacturaCargaController(parser, new FacturaCargaService(jdbc,parser,cargas,mapper),cargas);
                var resultado = api.importar(file,null);
                assertEquals(CargaEstado.COMPLETADA_CON_INCIDENCIAS, resultado.estado());
                assertEquals(filas.size(), resultado.procesados());
                assertEquals(resultado.creados(), jdbc.sql("select count(*) from factura_importada").query(Integer.class).single());
                assertTrue(resultado.creados() > 0);
                assertTrue(resultado.ignorados() > 0);
                assertNotNull(resultado.finalizadoAt());
                if (System.getProperty("facturas.integrationSample",System.getProperty("facturas.sample")) != null) {
                    var candidatos = api.revisarPeriodos(file);
                    var seleccion = candidatos.stream().filter(c -> !c.cuenta().equals("150-999999-999"))
                            .map(FacturaExcelParser.Candidato::fila).collect(java.util.stream.Collectors.toSet());
                    var aceptadas = api.importar(file, seleccion);
                    assertEquals(6, aceptadas.creados());
                    assertEquals(1, aceptadas.errores());
                    if (filas.get(0).datos().containsKey("fecha de emision")) {
                        assertTrue(jdbc.sql("select count(*) from factura_importada where fecha_emision is not null and fecha_vencimiento is not null").query(Integer.class).single()>0);
                        var reportes = new pe.morosos.reporte.service.FacturacionRecaudacionService(jdbc);
                        var reporte = reportes.obtener("INICIO","2026-12-31",null,null,pe.morosos.reporte.service.FacturacionRecaudacionService.Tipo.TODOS).reporte();
                        assertFalse(reporte.pagos().isEmpty());
                        assertTrue(reporte.pagos().stream().anyMatch(p -> p.cumplimiento().equals("EN_TERMINO")));
                        assertTrue(reporte.pagos().stream().anyMatch(p -> p.cumplimiento().equals("FUERA_TERMINO")));
                        assertEquals(reporte.totales().conceptosPagados(),reporte.pagos().size());
                        assertEquals(reporte.totales().recaudado(),reporte.pagos().stream().map(pe.morosos.reporte.service.FacturacionRecaudacionCalculator.Pago::importe).reduce(java.math.BigDecimal.ZERO,java.math.BigDecimal::add));
                        var vigentes=reportes.obtener("INICIO","2026-12-31",null,null,pe.morosos.reporte.service.FacturacionRecaudacionService.Tipo.VIGENTE).reporte();
                        var vencidos=reportes.obtener("INICIO","2026-12-31",null,null,pe.morosos.reporte.service.FacturacionRecaudacionService.Tipo.VENCIDO).reporte();
                        var otros=reportes.obtener("INICIO","2026-12-31",null,null,pe.morosos.reporte.service.FacturacionRecaudacionService.Tipo.OTROS).reporte();
                        assertEquals(reporte.pagos().stream().filter(p->p.tipo().equals("NORMAL")&&p.cumplimiento().equals("EN_TERMINO")).count(),vigentes.pagos().size());
                        assertEquals(reporte.pagos().stream().filter(p->p.tipo().equals("NORMAL")&&p.cumplimiento().equals("FUERA_TERMINO")).count(),vencidos.pagos().size());
                        assertEquals(reporte.pagos().stream().filter(p->p.tipo().equals("CAUDALIMETRO")).count(),otros.pagos().size());
                        var acotado=reportes.obtener("2023-11-24","2023-11-24",null,null,pe.morosos.reporte.service.FacturacionRecaudacionService.Tipo.VENCIDO).reporte();
                        assertTrue(acotado.pagos().stream().allMatch(p->p.fechaPago().equals(java.time.LocalDate.of(2023,11,24))&&p.cumplimiento().equals("FUERA_TERMINO")&&p.tipo().equals("NORMAL")));
                        var dia=reportes.obtener("2023-10-21","2023-10-21",null,null,pe.morosos.reporte.service.FacturacionRecaudacionService.Tipo.NORMAL).reporte();
                        assertTrue(dia.totales().conceptosEmitidos()>0);
                    }
                    assertEquals(6, jdbc.sql("select count(*) from factura_importada where codigo_caudalimetro is not null and periodo is null and not plan_pago").query(Integer.class).single());
                }
                if (System.getProperty("facturas.integrationSample",System.getProperty("facturas.sample")) == null) {
                    var siguiente = excel(new String[][] {
                        {"1","150-000001-000","9/2026","Pagado","01-10-2026","100,00"},
                        {"3","150-000001-000","9/2026","Pagado","03-10-2026","120,00"},
                        {"4","150-000001-000","9/2026","Pagado","02-10-2026","99,00"},
                        {"5","150-000001-000","/","No pagado","","50,00"}
                    });
                    var comparada = api.importar(siguiente,null);
                    assertEquals(1,comparada.creados());
                    assertEquals(1,comparada.actualizados());
                    assertEquals(1,comparada.conflictos());
                    assertEquals(1,comparada.facturasRepetidasIguales());
                    assertEquals(2,comparada.facturasConDiferencias());
                    var cambios = api.cambios(comparada.id(),org.springframework.data.domain.PageRequest.of(0,10)).content();
                    assertEquals(2,cambios.size());
                    assertEquals("3",cambios.get(0).numero());
                    var estado=cambios.get(0).campos().stream().filter(c->c.campo().equals("Estado de pago")).findFirst().orElseThrow();
                    assertEquals("No pagado",estado.anterior());
                    assertEquals("Pagado",estado.vigente());
                    var importe=cambios.get(1).campos().stream().filter(c->c.campo().equals("Importe a cobrar")).findFirst().orElseThrow();
                    assertEquals("90",importe.anterior());
                    assertEquals("99",importe.informado());
                    assertEquals("90",importe.vigente());
                    var repetida=api.importar(siguiente,null);
                    assertEquals(0,repetida.creados());
                    assertEquals(3,repetida.facturasRepetidasIguales());
                    assertEquals(1,repetida.facturasConDiferencias());
                    assertEquals(cambios,api.cambios(comparada.id(),org.springframework.data.domain.PageRequest.of(0,10)).content());
                }
            } finally {
                ds.getConnection().rollback();
                ds.getConnection().setAutoCommit(true);
                jdbc.sql("drop schema " + schema + " cascade").update();
            }
        }
    }

    private MockMultipartFile archivo() throws Exception {
        String ruta = System.getProperty("facturas.integrationSample",System.getProperty("facturas.sample"));
        if (ruta != null) return new MockMultipartFile("file","facturacion.xlsx","",Files.readAllBytes(Path.of(ruta)));
        return excel(new String[][] {
                {"1","150-000001-000","9/2026","Pagado","01-10-2026","100,00"},
                {"2","150-999999-999","/","No pagado","","0,00"},
                {"3","150-000001-000","9/2026","No pagado","","110,00"},
                {"4","150-000001-000","9/2026","Pagado","02-10-2026","90,00"}
        });
    }

    private MockMultipartFile excel(String[][] lineas) throws Exception {
        try (var book = new XSSFWorkbook(); var out = new ByteArrayOutputStream()) {
            var hoja = book.createSheet();
            String[][] datos = new String[lineas.length+1][];
            datos[0] = new String[]{"Num Factura","Inmueble","Periodo","Estado","Fecha de Pago","Importe a cobrar"};
            System.arraycopy(lineas,0,datos,1,lineas.length);
            for (int i=0;i<datos.length;i++) {
                var fila = hoja.createRow(i);
                for (int j=0;j<datos[i].length;j++) fila.createCell(j).setCellValue(datos[i][j]);
            }
            book.write(out);
            return new MockMultipartFile("file","facturacion.xlsx","",out.toByteArray());
        }
    }
}
