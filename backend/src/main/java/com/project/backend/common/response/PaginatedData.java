package com.project.backend.common.response;

import java.util.List;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "페이지네이션 목록")
public record PaginatedData<T>(List<T> items, Pagination pagination) {
    public record Pagination(
            @Schema(description = "현재 페이지 (1부터 시작)", example = "1") int page,
            int pageSize,
            long totalItems,
            int totalPages
    ) {
    }
}
