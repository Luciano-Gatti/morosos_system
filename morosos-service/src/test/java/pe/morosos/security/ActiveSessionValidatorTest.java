package pe.morosos.security;

import static org.assertj.core.api.Assertions.assertThat;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

class ActiveSessionValidatorTest {
    private HttpServer server;
    private ActiveSessionValidator validator;
    private int status;
    private String body;
    private String authorization;

    @BeforeEach void setup() throws Exception {
        status = 200;
        body = "{\"id\":\"user-1\",\"authVersion\":2}";
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/api/v1/auth/me", exchange -> {
            authorization = exchange.getRequestHeaders().getFirst("Authorization");
            byte[] data = body.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(status, data.length);
            try (var output = exchange.getResponseBody()) { output.write(data); }
        });
        server.start();
        validator = new ActiveSessionValidator("http://127.0.0.1:" + server.getAddress().getPort(), new ObjectMapper());
    }
    @AfterEach void cleanup() { server.stop(0); }
    private Jwt token() { return Jwt.withTokenValue("signed-token").header("alg", "HS256").subject("user-1").claim("authVersion", 2L).build(); }
    @Test void acceptsMatchingActiveSession() {
        assertThat(validator.validate(token()).hasErrors()).isFalse();
        assertThat(authorization).isEqualTo("Bearer signed-token");
    }
    @Test void rejectsRevokedSession() { status = 401; assertThat(validator.validate(token()).hasErrors()).isTrue(); }
    @Test void rejectsDifferentVersion() { body = "{\"id\":\"user-1\",\"authVersion\":3}"; assertThat(validator.validate(token()).hasErrors()).isTrue(); }
    @Test void rejectsDifferentUser() { body = "{\"id\":\"user-2\",\"authVersion\":2}"; assertThat(validator.validate(token()).hasErrors()).isTrue(); }
    @Test void failsClosedOnServiceFailure() { status = 503; assertThat(validator.validate(token()).hasErrors()).isTrue(); }
}
