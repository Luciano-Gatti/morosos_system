package pe.morosos.common.api;

import java.util.List;
import org.springframework.data.domain.Page;

/** Explicit JSON contract retaining the pagination fields consumed by existing clients. */
public record StablePageResponse<T>(List<T> content, int number, int size, long totalElements, int totalPages) {
    public static <T> StablePageResponse<T> from(Page<T> page) {
        return new StablePageResponse<>(page.getContent(), page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }
}
