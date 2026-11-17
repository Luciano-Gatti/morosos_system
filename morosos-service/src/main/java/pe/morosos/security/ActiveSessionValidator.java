package pe.morosos.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/** Checks current account state/version after local signature validation. No token cache. */
@Component
public class ActiveSessionValidator implements OAuth2TokenValidator<Jwt> {
    private final URI endpoint;
    private final ObjectMapper mapper;
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();

    public ActiveSessionValidator(@Value("${app.security.auth-base-url:http://localhost:8080}") String baseUrl,
                                  ObjectMapper mapper) {
        this.endpoint = URI.create(baseUrl.replaceAll("/+$", "") + "/api/v1/auth/me");
        this.mapper = mapper;
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt token) {
        try {
            var request = HttpRequest.newBuilder(endpoint).timeout(Duration.ofSeconds(5))
                    .header("Authorization", "Bearer " + token.getTokenValue())
                    .header("Accept", "application/json").GET().build();
            var response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                var user = mapper.readTree(response.body());
                Number version = token.getClaim("authVersion");
                if (user != null && token.getSubject().equals(user.path("id").asText())
                        && version != null && user.has("authVersion")
                        && version.longValue() == user.path("authVersion").asLong()) {
                    return OAuth2TokenValidatorResult.success();
                }
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        } catch (Exception exception) {
            // Fail closed; never log the bearer token or the remote response.
        }
        return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Sesion no vigente o no verificable.", null));
    }
}
