package pe.morosos.reporte.controller;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import pe.morosos.reporte.service.FacturacionRecaudacionService;

@RestController
@RequestMapping("/api/v1/reportes/facturacion-recaudacion")
@RequiredArgsConstructor
public class FacturacionRecaudacionController {
    private final FacturacionRecaudacionService service;
    @GetMapping
    @PreAuthorize("hasAuthority('REPORTES_VER_FACTURACION_RECAUDACION')")
    public FacturacionRecaudacionService.Respuesta obtener(@RequestParam String desde,@RequestParam String hasta,
            @RequestParam(required=false) UUID grupoId,
            @RequestParam(required=false) UUID distritoId,
            @RequestParam(defaultValue="TODOS") FacturacionRecaudacionService.Tipo tipo,
            @RequestParam(required=false) java.util.Set<FacturacionRecaudacionService.Concepto> conceptos,
            @RequestParam(required=false) java.util.Set<FacturacionRecaudacionService.Cumplimiento> cumplimiento) {
        return service.obtener(desde,hasta,grupoId,distritoId,tipo,conceptos,cumplimiento);
    }
}
