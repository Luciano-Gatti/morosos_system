package pe.morosos.common.api;
import static org.junit.jupiter.api.Assertions.*;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
class StablePageResponseTest {
    @Test void mantieneContratoJsonConsumidoPorFrontend() throws Exception {
        var response = StablePageResponse.from(new PageImpl<>(List.of("factura"), PageRequest.of(1, 2), 5));
        var json = new ObjectMapper().readTree(new ObjectMapper().writeValueAsString(response));
        assertEquals("factura", json.get("content").get(0).asText());
        assertEquals(1, json.get("number").asInt());
        assertEquals(2, json.get("size").asInt());
        assertEquals(5, json.get("totalElements").asLong());
        assertEquals(3, json.get("totalPages").asInt());
        assertFalse(json.has("pageable"));
    }
}
