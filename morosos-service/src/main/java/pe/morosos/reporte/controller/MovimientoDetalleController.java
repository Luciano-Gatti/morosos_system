package pe.morosos.reporte.controller;

import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import pe.morosos.reporte.service.MovimientoDetalleService;
import static pe.morosos.reporte.service.FacturacionRecaudacionService.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/reportes/facturacion-recaudacion/detalle")
public class MovimientoDetalleController {
    private final MovimientoDetalleService service;
    @GetMapping
    @PreAuthorize("hasAuthority('REPORTES_VER_FACTURACION_RECAUDACION')")
    public MovimientoDetalleService.Detalle obtener(@RequestParam String desde,@RequestParam String hasta,@RequestParam String mes,
        @RequestParam MovimientoDetalleService.Movimiento movimiento,@RequestParam(required=false) UUID grupoId,@RequestParam(required=false) UUID distritoId,
        @RequestParam(required=false) Set<Concepto> conceptos,@RequestParam(required=false) Set<Cumplimiento> cumplimiento) {
        return service.obtener(desde,hasta,mes,movimiento,grupoId,distritoId,conceptos,cumplimiento);
    }
}
