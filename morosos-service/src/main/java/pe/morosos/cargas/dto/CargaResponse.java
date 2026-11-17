package pe.morosos.cargas.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import pe.morosos.cargas.model.CargaEstado;
import pe.morosos.cargas.model.CargaOrigen;
import pe.morosos.cargas.model.CargaTipo;

public record CargaResponse(
        UUID id, CargaTipo tipo, CargaOrigen origen, String sistemaOrigen,
        LocalDate periodoReferencia, CargaEstado estado, String archivoNombre,
        int procesados, int creados, int actualizados, int sinCambios,
        int ignorados, int conflictos, int errores, int noEncontrados,
        BigDecimal montoTotal, Instant iniciadoAt, Instant finalizadoAt,
        String createdBy, Instant createdAt, Integer facturasConDiferencias, Integer facturasRepetidasIguales
) {}
