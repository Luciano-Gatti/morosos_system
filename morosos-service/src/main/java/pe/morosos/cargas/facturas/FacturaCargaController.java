package pe.morosos.cargas.facturas;

import java.util.UUID;
import pe.morosos.common.api.StablePageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.data.domain.*;
import org.springframework.data.web.PageableDefault;
import pe.morosos.cargas.model.*;
import pe.morosos.cargas.dto.CargaResponse;
import pe.morosos.cargas.service.CargaRegistroService;

@RestController
@RequestMapping("/api/v1/cargas")
@RequiredArgsConstructor
public class FacturaCargaController {
    private final FacturaExcelParser parser;
    private final FacturaCargaService service;
    private final CargaRegistroService cargas;

    @PostMapping("/facturacion-pagos/revisar-periodos")
    @PreAuthorize("hasAuthority('CARGAS_IMPORTAR_FACTURACION_PAGOS')")
    public java.util.List<FacturaExcelParser.Candidato> revisarPeriodos(@RequestParam("file") MultipartFile file) {
        return parser.candidatos(parser.leer(file));
    }

    @PostMapping("/facturacion-pagos/excel")
    @PreAuthorize("hasAuthority('CARGAS_IMPORTAR_FACTURACION_PAGOS')")
    public CargaResponse importar(@RequestParam("file") MultipartFile file,
            @RequestParam(required=false) java.util.Set<Integer> filasCaudalimetro) {
        var filas=parser.aplicarSeleccion(parser.leer(file), filasCaudalimetro);
        UUID id=cargas.iniciar(CargaTipo.FACTURACION_PAGOS,CargaOrigen.EXCEL,null,null,file.getOriginalFilename());
        try {service.importar(id,filas);return cargas.obtener(id);}
        catch(RuntimeException e) {cargas.fallar(id,"IMPORTACION_FALLIDA","No se guardaron las facturas de esta carga.");throw e;}
    }
    @GetMapping("/{id}/facturas/cambios")
    @PreAuthorize("hasAuthority('CARGAS_VER_DETALLE')")
    public StablePageResponse<FacturaCargaService.Cambio> cambios(@PathVariable UUID id,@PageableDefault(size=25) Pageable pageable) {
        return StablePageResponse.from(service.cambios(id,pageable));
    }

    @GetMapping("/{id}/facturas")
    @PreAuthorize("hasAuthority('CARGAS_VER_DETALLE')")
    public StablePageResponse<FacturaCargaService.Detalle> detalle(@PathVariable UUID id,@PageableDefault(size=25) Pageable pageable) {
        return StablePageResponse.from(service.detalle(id,pageable));
    }
}
