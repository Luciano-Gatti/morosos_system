package pe.morosos.common.api;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import pe.morosos.inmueble.controller.InmuebleController;
import pe.morosos.inmueble.service.InmuebleService;
import pe.morosos.deuda.controller.CargaDeudaController;
import pe.morosos.deuda.service.CargaDeudaQueryService;
import pe.morosos.deuda.service.ImportacionDeudaService;
import pe.morosos.importacion.controller.ImportacionInmuebleController;
import pe.morosos.importacion.service.ImportacionInmuebleService;

class PagedEndpointsTest {
    private MockMvc mvc;
    private <T> T pagedService(Class<T> type) {
        return mock(type, invocation -> Page.class.isAssignableFrom(invocation.getMethod().getReturnType())
            ? new PageImpl<>(List.of(), PageRequest.of(1, 20), 0)
            : RETURNS_DEFAULTS.answer(invocation));
    }
    @BeforeEach void setup() {
        mvc = MockMvcBuilders.standaloneSetup(
            new InmuebleController(pagedService(InmuebleService.class)),
            new CargaDeudaController(pagedService(CargaDeudaQueryService.class), mock(ImportacionDeudaService.class)),
            new ImportacionInmuebleController(pagedService(ImportacionInmuebleService.class)))
            .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver()).build();
    }
    @ParameterizedTest
    @ValueSource(strings = {
        "/api/v1/inmuebles",
        "/api/v1/deuda/cargas",
        "/api/v1/deuda/cargas/00000000-0000-0000-0000-000000000001/detalles",
        "/api/v1/deuda/cargas/00000000-0000-0000-0000-000000000001/errores",
        "/api/v1/inmuebles/importaciones/00000000-0000-0000-0000-000000000001/errores"
    })
    void devuelveContratoEstableCompatibleConFrontend(String path) throws Exception {
        mvc.perform(get(path).param("page", "1").param("size", "20"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray())
            .andExpect(jsonPath("$.number").value(1))
            .andExpect(jsonPath("$.size").value(20))
            .andExpect(jsonPath("$.totalElements").value(0))
            .andExpect(jsonPath("$.totalPages").value(0))
            .andExpect(jsonPath("$.pageable").doesNotExist());
    }
}
