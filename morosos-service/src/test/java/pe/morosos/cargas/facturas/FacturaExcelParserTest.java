package pe.morosos.cargas.facturas;

import static org.junit.jupiter.api.Assertions.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.io.ByteArrayOutputStream;
import java.nio.file.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.mock.web.MockMultipartFile;
import pe.morosos.common.exception.ValidationException;
import pe.morosos.cargas.facturas.FacturaExcelParser.Fila;

class FacturaExcelParserTest {
    private final FacturaExcelParser parser=new FacturaExcelParser();
    static Fila fila(String periodo,String estado,String fecha,String importe) {
        return new Fila(2,Map.of("num factura","25487","inmueble","150-000001-000","periodo",periodo,"estado",estado,"fecha de pago",fecha,"importe a cobrar",importe));
    }
    @Test void calculaFacturadoDesdeNetoIvaYDescuentosSinUsarTotalFactura() {
        var datos=new HashMap<>(fila("9/2026","No pagado","","0,00").datos());
        datos.put("importe neto","1000,00"); datos.put("iva","210,00"); datos.put("importe descuentos","50,00");
        datos.put("total factura","0,00");
        var f=parser.convertir(new Fila(2,datos));
        assertEquals(new BigDecimal("1160.00"),f.facturado());
        assertEquals(new BigDecimal("0.00"),f.importe());
    }
    @Test void rechazaBasesIncompletasYDescuentosMayoresAlTotal() {
        var datos=new HashMap<>(fila("9/2026","No pagado","","0").datos());
        datos.put("importe neto","100");
        assertThrows(ValidationException.class,()->parser.convertir(new Fila(2,datos)));
        datos.put("iva","21");datos.put("importe descuentos","122");
        assertThrows(ValidationException.class,()->parser.convertir(new Fila(2,datos)));
    }
    @Test void soloAceptaPeriodosEspecialesSeleccionados() {
        var filas = List.of(fila("25/2002","Pagado","24-11-2023","85,00"));
        assertEquals("25/2002",parser.candidatos(filas).get(0).periodo());
        assertThrows(ValidationException.class,()->parser.convertir(filas.get(0)));
        var aceptada = parser.convertir(parser.aplicarSeleccion(filas,Set.of(2)).get(0));
        assertNull(aceptada.periodo());
        assertFalse(aceptada.planPago());
        assertEquals("25/2002",aceptada.codigoCaudalimetro());
        assertThrows(ValidationException.class,()->parser.aplicarSeleccion(filas,Set.of(3)));
        assertThrows(ValidationException.class,()->parser.aplicarSeleccion(List.of(fila("9/2023","No pagado","","0")),Set.of(2)));
        assertThrows(ValidationException.class,()->parser.aplicarSeleccion(List.of(fila("/","No pagado","","0")),Set.of(2)));
    }
    @Test void conservaImporteCobradoYPeriodoIndependientesDeFechaPago() {
        var f=parser.convertir(fila("9/2023","Pagado","24-11-2023","8.688,34"));
        assertEquals(LocalDate.of(2023,9,1),f.periodo());
        assertEquals(LocalDate.of(2023,11,24),f.fechaPago());
        assertEquals(new BigDecimal("8688.34"),f.importe());
        assertTrue(f.pagado()); assertFalse(f.planPago());
    }
    @Test void reconocePlanSinInventarPeriodo() {
        var f=parser.convertir(fila("/","Pagado","24-11-2023","100,00"));
        assertTrue(f.planPago()); assertNull(f.periodo());
    }
    @Test void conservaNoPagadoConImporteCero() {
        var f=parser.convertir(fila("3/2024","No pagado","","0,00"));
        assertFalse(f.pagado()); assertNull(f.fechaPago()); assertEquals(new BigDecimal("0.00"),f.importe());
    }
    @ParameterizedTest @ValueSource(strings={"20/2023","0/2023","2023","", "1/2"})
    void rechazaPeriodoInvalido(String periodo) { assertThrows(ValidationException.class,()->parser.convertir(fila(periodo,"No pagado","","1,00"))); }
    @ParameterizedTest @ValueSource(strings={"", "abc","-1,00","10,123","1,000.00"})
    void rechazaImporteInvalido(String importe) {assertThrows(ValidationException.class,()->parser.convertir(fila("1/2024","No pagado","",importe)));}
    @Test void exigeCoherenciaEstadoYFecha() {
        assertThrows(ValidationException.class,()->parser.convertir(fila("1/2024","Pagado","","1")));
        assertThrows(ValidationException.class,()->parser.convertir(fila("1/2024","No pagado","01-01-2024","1")));
        assertThrows(ValidationException.class,()->parser.convertir(fila("1/2024","Pagado","31-02-2024","1")));
        assertThrows(ValidationException.class,()->parser.convertir(fila("1/2024","Anulado","","1")));
    }
    @Test void leeExcelConColumnasReordenadasImporteNumericoYFechaNativa() throws Exception {
        try(var w=new XSSFWorkbook();var out=new ByteArrayOutputStream()) {
            var s=w.createSheet();var h=s.createRow(0);
            String[] headers={"Estado","Importe a cobrar","Período","Num Factura","Inmueble","Fecha de Pago"};
            for(int i=0;i<headers.length;i++) h.createCell(i).setCellValue(headers[i]);
            var r=s.createRow(1);r.createCell(0).setCellValue("Pagado");r.createCell(1).setCellValue(8688.34);
            r.createCell(2).setCellValue("9/2023");r.createCell(3).setCellValue(25487);r.createCell(4).setCellValue("150-000001-000");
            var date=r.createCell(5);date.setCellValue(LocalDate.of(2023,11,24));var style=w.createCellStyle();style.setDataFormat(w.createDataFormat().getFormat("dd-mm-yyyy"));date.setCellStyle(style);
            w.write(out);
            var rows=parser.leer(new MockMultipartFile("file","test.xlsx","",out.toByteArray()));
            assertEquals(1,rows.size()); assertEquals(2,rows.get(0).numeroFila());
            assertEquals(parser.convertir(fila("9/2023","Pagado","24-11-2023","8688,34")),parser.convertir(rows.get(0)));
        }
    }
    @Test void validaArchivoRealCuandoSeIndicaRuta() throws Exception {
        String path=System.getProperty("facturas.sample"); Assumptions.assumeTrue(path!=null);
        var rows=parser.leer(new MockMultipartFile("file","facturacion.xlsx","",Files.readAllBytes(Path.of(path))));
        assertEquals(8000,rows.size());
        int prueba=0,validas=0,invalidas=0,planes=0;
        for(var r:rows) {
            if(r.datos().get("inmueble").equals("150-999999-999")){prueba++;continue;}
            try {var f=parser.convertir(r);validas++;if(f.planPago())planes++;}
            catch(ValidationException e){invalidas++;System.out.println("Fila inválida " + r.numeroFila() + ": " + e.getMessage());}
        }
        assertEquals(39,prueba);
        System.out.printf("Excel real: válidas=%d, inválidas=%d, planes=%d, prueba=%d%n",validas,invalidas,planes,prueba);
        assertEquals(7954,validas);
        assertEquals(7,invalidas);
        assertEquals(817,planes);
    }
    @Test void aceptaEncabezadosDeArchivoDeDiagnostico() throws Exception {
        String path=System.getProperty("facturas.headerSample"); Assumptions.assumeTrue(path!=null);
        var rows=parser.leer(new MockMultipartFile("file","facturacion.xlsx","",Files.readAllBytes(Path.of(path))));
        assertFalse(rows.isEmpty());
        assertTrue(rows.get(0).datos().keySet().containsAll(List.of("num factura","inmueble","periodo","estado","fecha de pago","importe a cobrar","importe neto","iva","importe descuentos")));
        System.out.printf("Encabezados aceptados por el importador de facturación; filas leídas: %d%n",rows.size());
    }
    @Test void leeFechasDeEmisionYVencimiento() {
        var datos = new HashMap<>(fila("9/2023","Pagado","24-11-2023","100").datos());
        datos.put("fecha de emision","21-10-2023"); datos.put("fecha de vencimiento","31-10-2023");
        var f=parser.convertir(new FacturaExcelParser.Fila(2,datos));
        assertEquals(LocalDate.of(2023,10,21),f.fechaEmision());
        assertEquals(LocalDate.of(2023,10,31),f.fechaVencimiento());
        datos.put("fecha de vencimiento","31-02-2023");
        assertThrows(ValidationException.class,()->parser.convertir(new FacturaExcelParser.Fila(2,datos)));
        datos.put("fecha de vencimiento","20-10-2023");
        assertThrows(ValidationException.class,()->parser.convertir(new FacturaExcelParser.Fila(2,datos)));
    }
}
