package pe.morosos.auth.security.jwt;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.servlet.ServletException;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import pe.morosos.auth.security.AuthPrincipal;

class JwtAuthenticationFilterTest {

    private final JwtService jwtService = org.mockito.Mockito.mock(JwtService.class);
    private final JwtAuthenticationEntryPoint entryPoint = org.mockito.Mockito.mock(JwtAuthenticationEntryPoint.class);
    private final pe.morosos.auth.user.repository.UsuarioRepository usuarios = org.mockito.Mockito.mock(pe.morosos.auth.user.repository.UsuarioRepository.class);
    private final JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwtService, entryPoint, usuarios);

    @Test
    void rejectsStaleOrDisabledAccountBeforeContinuingChain() throws Exception {
        var principal = new AuthPrincipal(UUID.randomUUID(), "admin", "a@test.com", List.of(), List.of("USUARIOS_EDITAR"), 0L);
        when(jwtService.validateAccessToken("stale")).thenReturn(principal);
        var usuario = new pe.morosos.auth.user.entity.Usuario();
        usuario.setEstado(pe.morosos.auth.user.entity.EstadoUsuario.ACTIVO);
        usuario.setAuthVersion(1L);
        when(usuarios.findById(principal.userId())).thenReturn(java.util.Optional.of(usuario));
        var request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer stale");
        var chain = new MockFilterChain();
        filter.doFilter(request, new MockHttpServletResponse(), chain);
        org.assertj.core.api.Assertions.assertThat(chain.getRequest()).isNull();
        org.assertj.core.api.Assertions.assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        usuario.setAuthVersion(0L);
        usuario.setEstado(pe.morosos.auth.user.entity.EstadoUsuario.INACTIVO);
        chain = new MockFilterChain();
        filter.doFilter(request, new MockHttpServletResponse(), chain);
        org.assertj.core.api.Assertions.assertThat(chain.getRequest()).isNull();
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void doesNotOverwriteExistingSecurityContextAuthentication() throws ServletException, IOException {
        UsernamePasswordAuthenticationToken existingAuthentication = new UsernamePasswordAuthenticationToken(
                "already-authenticated",
                null,
                List.of(new SimpleGrantedAuthority("EXISTING_AUTHORITY"))
        );
        SecurityContextHolder.getContext().setAuthentication(existingAuthentication);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer incoming-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        verify(jwtService, never()).validateAccessToken("incoming-token");
        org.assertj.core.api.Assertions.assertThat(SecurityContextHolder.getContext().getAuthentication())
                .isSameAs(existingAuthentication);
    }

    @Test
    void buildsAuthoritiesFromPermissionsWhenSecurityContextIsEmpty() throws ServletException, IOException {
        AuthPrincipal principal = new AuthPrincipal(
                UUID.randomUUID(),
                "admin",
                "admin@local.test",
                List.of("ADMIN"),
                List.of("INMUEBLES_VER_LISTADO", "REPORTES_EXPORTAR_PDF"),
                0L
        );
        when(jwtService.validateAccessToken("valid-token")).thenReturn(principal);
        var usuario = new pe.morosos.auth.user.entity.Usuario();
        usuario.setEstado(pe.morosos.auth.user.entity.EstadoUsuario.ACTIVO);
        when(usuarios.findById(principal.userId())).thenReturn(java.util.Optional.of(usuario));
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer valid-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        org.assertj.core.api.Assertions.assertThat(SecurityContextHolder.getContext().getAuthentication().getAuthorities())
                .extracting("authority")
                .containsExactly("INMUEBLES_VER_LISTADO", "REPORTES_EXPORTAR_PDF");
    }
}
