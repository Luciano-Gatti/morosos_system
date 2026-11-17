package pe.morosos.inmueble.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record InmuebleUpdateRequest(
        @Size(max = 50) String telefono,
        @Email @Size(max = 150) String email,
        String observacion,
        UUID distritoId,
        UUID grupoId,
        Boolean esPrueba,
        @jakarta.validation.constraints.Pattern(regexp = "(?:Jubilados|Discapacidad|Tarifa social)?") String beneficioCuenta
) {
}
