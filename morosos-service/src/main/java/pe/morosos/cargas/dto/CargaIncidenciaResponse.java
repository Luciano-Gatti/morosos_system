package pe.morosos.cargas.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.UUID;
import pe.morosos.cargas.model.IncidenciaResultado;

public record CargaIncidenciaResponse(
        UUID id, UUID cargaId, Integer fila, String cuenta,
        IncidenciaResultado resultado, String codigo, String mensaje,
        JsonNode payload, String createdBy, Instant createdAt
) {}
