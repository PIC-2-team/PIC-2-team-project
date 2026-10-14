package com.project.backend.ai;

import com.project.backend.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "AI")
@RestController
@RequestMapping("/api/ai/record-drafts")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class RecordDraftController {
    private final RecordDraftService service;

    @Operation(summary = "AI 생활기록 초안 생성")
    @PostMapping
    public ApiResponse<RecordDraftResponse> create(@AuthenticationPrincipal Long userId,
            @RequestBody RecordDraftRequest request) {
        return ApiResponse.ok(service.create(userId, request));
    }
}
