package pe.morosos.auth.admin.api;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import pe.morosos.auth.admin.dto.AdminUserRequest;
import pe.morosos.auth.admin.service.AdminUserService;
import pe.morosos.auth.user.entity.EstadoUsuario;

class AdminUsersAuthorizationTest {
    private final AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext(Config.class);
    private final AdminUsersController controller = context.getBean(AdminUsersController.class);
    private final AdminUserService service = context.getBean(AdminUserService.class);
    @Configuration @EnableMethodSecurity static class Config {
        @Bean AdminUserService service() { return mock(AdminUserService.class); }
        @Bean AdminUsersController controller(AdminUserService service) { return new AdminUsersController(service); }
    }
    @AfterEach void cleanup() { SecurityContextHolder.clearContext(); context.close(); }
    private void permission(String permission) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "editor", null, List.of(new SimpleGrantedAuthority(permission))));
    }
    private AdminUserRequest request(List<String> roles, List<String> permissions) {
        return new AdminUserRequest("user", "u@test.com", "User", "Test", null, roles, permissions);
    }
    @Test void cannotRemoveRolesWithoutRoleAssignmentPermission() {
        permission("USUARIOS_EDITAR");
        assertThatThrownBy(() -> controller.update(UUID.randomUUID(), request(List.of(), null), null)).isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(service);
    }
    @Test void cannotRemoveDirectPermissionsWithoutAssignmentPermission() {
        permission("USUARIOS_EDITAR");
        assertThatThrownBy(() -> controller.update(UUID.randomUUID(), request(null, List.of()), null)).isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(service);
    }
    @Test void identityOnlyUpdateDoesNotRequireAssignmentPermissions() {
        permission("USUARIOS_EDITAR");
        UUID id = UUID.randomUUID();
        var request = request(null, null);
        controller.update(id, request, null);
        verify(service).update(id, request, null);
    }
    @Test void creationCannotActivateWithoutStatusPermission() {
        permission("USUARIOS_CREAR");
        var request = new AdminUserRequest("user", "u@test.com", "User", "Test", EstadoUsuario.ACTIVO, null, null);
        assertThatThrownBy(() -> controller.create(request, null)).isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(service);
    }
}
