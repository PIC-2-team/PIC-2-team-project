package com.project.backend.common.response;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "공통 성공 응답")
public record ApiResponse<T>(boolean success, T data) {
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data);
    }
}
