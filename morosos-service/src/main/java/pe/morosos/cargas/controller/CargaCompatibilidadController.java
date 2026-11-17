package pe.morosos.cargas.controller;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import pe.morosos.cargas.dto.CargaResponse;
import pe.morosos.cargas.model.CargaOrigen;
import pe.morosos.cargas.model.CargaTipo;
import pe.morosos.cargas.service.CargaRegistroService;
import pe.morosos.cargas.service.CargaRegistroService.CargaMetricas;
import pe.morosos.deuda.service.ImportacionDeudaService;
import pe.morosos.importacion.service.ImportacionInmuebleService;

@RestController
@RequestMapping("/api/v1/cargas")
@RequiredArgsConstructor
public class CargaCompatibilidadController {
    private final CargaRegistroService cargas;
    private final ImportacionInmuebleService importacionInmuebleService;
    private final ImportacionDeudaService importacionDeudaService;

    @PostMapping("/inmuebles/excel")
    @PreAuthorize("hasAnyAuthority('CARGAS_IMPORTAR_INMUEBLES','INMUEBLES_IMPORTAR')")
    public CargaResponse inmuebles(@RequestParam("file") MultipartFile file) {
        UUID id = cargas.iniciar(CargaTipo.INMUEBLES, origen(file), null, null, file.getOriginalFilename());
        try {
            var result = importacionInmuebleService.importar(file);
            cargas.finalizar(id, new CargaMetricas(
                    result.procesados(), result.creados(), result.actualizados(), result.sinCambios(),
                    0, 0, result.errores(), 0, BigDecimal.ZERO
            ));
            return cargas.obtener(id);
        } catch (Exception ex) {
            cargas.fallar(id, "IMPORTACION_INMUEBLES_FALLIDA", message(ex));
            throw ex;
        }
    }

    @PostMapping("/deuda/excel")
    @PreAuthorize("hasAnyAuthority('CARGAS_IMPORTAR_DEUDA','DEUDA_IMPORTAR_CARGA')")
    public CargaResponse deuda(
            @RequestParam("periodo") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodo,
            @RequestParam("file") MultipartFile file) {
        UUID id = cargas.iniciar(CargaTipo.DEUDA, origen(file), null, periodo, file.getOriginalFilename());
        try {
            var result = importacionDeudaService.importar(periodo, file);
            cargas.finalizar(id, new CargaMetricas(
                    result.procesados(), result.procesados(), 0, 0,
                    0, 0, result.errores(), result.errores(), result.montoTotal()
            ));
            return cargas.obtener(id);
        } catch (Exception ex) {
            cargas.fallar(id, "IMPORTACION_DEUDA_FALLIDA", message(ex));
            throw ex;
        }
    }

    private CargaOrigen origen(MultipartFile file) {
        String name = file == null ? "" : file.getOriginalFilename();
        return name != null && name.toLowerCase().endsWith(".csv") ? CargaOrigen.CSV : CargaOrigen.EXCEL;
    }

    private String message(Exception ex) {
        return ex.getMessage() == null ? ex.getClass().getSimpleName() : ex.getMessage();
    }
}
