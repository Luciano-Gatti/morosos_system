package pe.morosos.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import pe.morosos.auth.dto.RefreshTokenRequest;
import pe.morosos.auth.security.AuthPrincipal;
import pe.morosos.auth.session.RefreshTokenService;
import pe.morosos.auth.user.entity.Usuario;
import pe.morosos.auth.user.repository.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
class AuthServiceSessionTest {
    @Mock UsuarioRepository usuarios;
    @Mock RefreshTokenService refreshTokens;
    @Mock AuthAuditService audit;
    @InjectMocks AuthService service;

    @AfterEach void cleanup() { SecurityContextHolder.clearContext(); }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"current-token", "already-revoked-token"})
    void logoutRevokesSessionWithoutConsumingPotentiallyRevokedToken(String token) {
        var id = UUID.randomUUID();
        var usuario = new Usuario();
        usuario.setId(id);
        usuario.setAuthVersion(4L);
        when(usuarios.findById(id)).thenReturn(Optional.of(usuario));
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                new AuthPrincipal(id, "admin", "admin@test.com", List.of(), List.of(), 4L), null, List.of()));
        service.logout(token == null ? null : new RefreshTokenRequest(token), null);
        verify(refreshTokens).revokeAllForUser(usuario);
        verify(refreshTokens, never()).consumeForRefresh(any());
        assertThat(usuario.getAuthVersion()).isEqualTo(5L);
    }
}
