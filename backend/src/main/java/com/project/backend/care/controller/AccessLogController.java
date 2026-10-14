package com.project.backend.care.controller;

import com.project.backend.care.dto.AccessLogResponse;
import com.project.backend.care.service.AccessLogService;
import com.project.backend.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@Tag(name = "AccessLogs")
@RestController
@RequestMapping("/api/care-recipients/{id}/access-logs")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class AccessLogController {

    private final AccessLogService accessLogService;

    @Operation(summary = "접근 이력 조회 (보호자 전용, cursor 페이지네이션)")
    @GetMapping
    public ApiResponse<List<AccessLogResponse>> getLogs(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime before) {
        return ApiResponse.ok(accessLogService.getLogs(userId, id, before));
    }
}
