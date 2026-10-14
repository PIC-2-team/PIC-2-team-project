package com.project.backend.record.controller;

import com.project.backend.common.response.ApiResponse;
import com.project.backend.record.dto.*;
import com.project.backend.record.entity.CareInfoCategory;
import com.project.backend.record.service.CareInfoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "CareInfo")
@RestController
@RequestMapping("/api/care-recipients/{careRecipientId}/care-info")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class CareInfoController {
    private final CareInfoService service;

    @Operation(summary = "돌봄정보와 중요 생활기록 조회")
    @GetMapping
    public ApiResponse<CareInfoOverviewResponse> list(@AuthenticationPrincipal Long userId, @PathVariable Long careRecipientId) {
        return ApiResponse.ok(service.list(userId, careRecipientId));
    }

    @Operation(summary = "분류별 돌봄정보 조회")
    @GetMapping("/{category}")
    public ApiResponse<CareInfoResponse> get(@AuthenticationPrincipal Long userId, @PathVariable Long careRecipientId,
                                             @PathVariable CareInfoCategory category) {
        return ApiResponse.ok(service.get(userId, careRecipientId, category));
    }

    @Operation(summary = "분류별 돌봄정보 저장")
    @PutMapping("/{category}")
    public ApiResponse<CareInfoResponse> put(@AuthenticationPrincipal Long userId, @PathVariable Long careRecipientId,
            @PathVariable CareInfoCategory category, @Valid @RequestBody PutCareInfoRequest request) {
        return ApiResponse.ok(service.put(userId, careRecipientId, category, request));
    }
}
