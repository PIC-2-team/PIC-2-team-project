package com.project.backend.common.response;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "공통 에러 응답")
public record ApiErrorResponse(boolean success, ApiError error) {
    public static ApiErrorResponse of(String code, String message) {
        return new ApiErrorResponse(false, new ApiError(code, message));
    }
}
