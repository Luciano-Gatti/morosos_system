package pe.morosos.cargas.controller;

import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import pe.morosos.common.api.StablePageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.morosos.cargas.dto.CargaIncidenciaResponse;
import pe.morosos.cargas.dto.CargaResponse;
import pe.morosos.cargas.model.CargaEstado;
import pe.morosos.cargas.model.CargaOrigen;
import pe.morosos.cargas.model.CargaTipo;
import pe.morosos.cargas.model.IncidenciaResultado;
import pe.morosos.cargas.service.CargaRegistroService;

@RestController
@RequestMapping("/api/v1/cargas")
@RequiredArgsConstructor
public class CargaController {
    private final CargaRegistroService service;

    @GetMapping
    @PreAuthorize("hasAuthority('CARGAS_VER_LISTADO')")
    public StablePageResponse<CargaResponse> listar(@RequestParam(required = false) CargaTipo tipo,
                                      @RequestParam(required = false) CargaOrigen origen,
                                      @RequestParam(required = false) CargaEstado estado,
                                      @ParameterObject @PageableDefault(size = 20) Pageable pageable) {
        return StablePageResponse.from(service.listar(tipo, origen, estado, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('CARGAS_VER_DETALLE')")
    public CargaResponse obtener(@PathVariable UUID id) {
        return service.obtener(id);
    }

    @GetMapping("/{id}/incidencias")
    @PreAuthorize("hasAuthority('CARGAS_VER_ERRORES')")
    public StablePageResponse<CargaIncidenciaResponse> incidencias(
            @PathVariable UUID id,
            @RequestParam(required = false) IncidenciaResultado resultado,
            @RequestParam(required = false) String cuenta,
            @RequestParam(required = false) String codigo,
            @RequestParam(required = false) String usuario,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant desde,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant hasta,
            @ParameterObject @PageableDefault(size = 50) Pageable pageable) {
        return obtenerIncidencias(id, resultado, cuenta, codigo, usuario, desde, hasta, pageable);
    }

    @GetMapping("/{id}/errores")
    @PreAuthorize("hasAuthority('CARGAS_VER_ERRORES')")
    public StablePageResponse<CargaIncidenciaResponse> errores(
            @PathVariable UUID id,
            @RequestParam(required = false) IncidenciaResultado resultado,
            @RequestParam(required = false) String cuenta,
            @RequestParam(required = false) String codigo,
            @RequestParam(required = false) String usuario,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant desde,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant hasta,
            @ParameterObject @PageableDefault(size = 50) Pageable pageable) {
        return obtenerIncidencias(id, resultado, cuenta, codigo, usuario, desde, hasta, pageable);
    }

    private StablePageResponse<CargaIncidenciaResponse> obtenerIncidencias(
            UUID id,
            IncidenciaResultado resultado,
            String cuenta,
            String codigo,
            String usuario,
            Instant desde,
            Instant hasta,
            Pageable pageable) {
        return StablePageResponse.from(service.incidencias(id, resultado, cuenta, codigo, usuario, desde, hasta, pageable));
    }
}
