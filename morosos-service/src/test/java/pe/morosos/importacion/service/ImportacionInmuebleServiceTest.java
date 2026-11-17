package pe.morosos.importacion.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import org.junit.jupiter.api.Test;

class ImportacionInmuebleServiceTest {

    @Test
    void identificaSoloLosTresBeneficiosEntreEtiquetasCombinadas() {
        assertEquals("Jubilados", ImportacionInmuebleService.beneficioPadron(Map.of("descuento",
                "Desc. Gob. de Ctes. 2025 (CF), Desc. Jubilados, Desc. Pago Anual 2024 (Loreto), "), null));
        assertEquals("Discapacidad", ImportacionInmuebleService.beneficioPadron(Map.of("descuento", "Desc. Por Discapacidad, "), null));
        assertEquals("Tarifa social", ImportacionInmuebleService.beneficioPadron(Map.of("descuento", "Desc. Tarifa Social, "), null));
        assertNull(ImportacionInmuebleService.beneficioPadron(Map.of("descuento", "Desc. Gob. de Ctes. 2026 (SM)"), "Jubilados"));
        assertNull(ImportacionInmuebleService.beneficioPadron(Map.of("descuento", ""), "Discapacidad"));
        assertEquals("Jubilados", ImportacionInmuebleService.beneficioPadron(Map.of(), "Jubilados"));
        assertThrows(IllegalArgumentException.class, () -> ImportacionInmuebleService.beneficioPadron(
                Map.of("descuento", "Desc. Jubilados, Tarifa Social"), null));
    }

    @Test
    void verificaElFormatoDelInformeCuandoSeIndicaLaRuta() throws Exception {
        String ruta = System.getProperty("inmuebles.sample");
        org.junit.jupiter.api.Assumptions.assumeTrue(ruta != null);
        var file = new org.springframework.mock.web.MockMultipartFile("file","informe.xlsx","",
                java.nio.file.Files.readAllBytes(java.nio.file.Path.of(ruta)));
        var rows = new pe.morosos.importacion.parser.ExcelRowParser().parse(file,
                java.util.List.of("cuenta","titular","direccion","grupo","distrito"));
        assertEquals(3003,rows.size());
        var conteos = new java.util.HashMap<String,Integer>();
        for (var row : rows) {
            assertFalse(row.get("titular").isBlank());
            String direccion = ImportacionInmuebleService.direccionPadron(row);
            assertFalse(direccion.isBlank());
            assertTrue(direccion.length() <= 300);
            String beneficio = ImportacionInmuebleService.beneficioPadron(row,null);
            if (beneficio != null) conteos.merge(beneficio,1,Integer::sum);
        }
        assertEquals(Map.of("Jubilados",428,"Discapacidad",11),conteos);
    }

    @Test
    void parseActivo_devuelveTrue_siNoExisteColumna() {
        assertTrue(ImportacionInmuebleService.parseActivo(Map.of("cuenta", "1")));
    }

    @Test
    void parseActivo_devuelveTrue_siExisteVacio() {
        assertTrue(ImportacionInmuebleService.parseActivo(Map.of("activo", "   ")));
    }

    @Test
    void parseActivo_aceptaValoresTrue() {
        assertTrue(ImportacionInmuebleService.parseActivo(Map.of("activo", "si")));
        assertTrue(ImportacionInmuebleService.parseActivo(Map.of("activo", "SÍ")));
        assertTrue(ImportacionInmuebleService.parseActivo(Map.of("activo", "1")));
        assertTrue(ImportacionInmuebleService.parseActivo(Map.of("activo", "ACTIVO")));
        assertTrue(ImportacionInmuebleService.parseActivo(Map.of("activo", "alta")));
    }

    @Test
    void parseActivo_aceptaValoresFalse() {
        assertFalse(ImportacionInmuebleService.parseActivo(Map.of("activo", "no")));
        assertFalse(ImportacionInmuebleService.parseActivo(Map.of("activo", "0")));
        assertFalse(ImportacionInmuebleService.parseActivo(Map.of("activo", "INACTIVO")));
        assertFalse(ImportacionInmuebleService.parseActivo(Map.of("activo", "BAJA")));
    }

    @Test
    void parseActivo_rechazaValorInvalido() {
        assertThrows(IllegalArgumentException.class, () ->
                ImportacionInmuebleService.parseActivo(Map.of("activo", "quizas")));
    }
}
