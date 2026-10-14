package com.project.backend.record.controller;

import com.project.backend.common.response.ApiResponse;
import com.project.backend.common.response.PaginatedData;
import com.project.backend.record.dto.CreateRecordSuggestionRequest;
import com.project.backend.record.dto.RecordSuggestionDecisionRequest;
import com.project.backend.record.dto.RecordSuggestionResponse;
import com.project.backend.record.entity.RecordSuggestionStatus;
import com.project.backend.record.service.RecordSuggestionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "RecordSuggestions")
@RestController
@RequestMapping("/api/care-recipients/{careRecipientId}")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class RecordSuggestionController {
    private final RecordSuggestionService service;

    @Operation(summary = "생활기록 수정 제안 작성")
    @PostMapping("/records/{recordId}/suggestions")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<RecordSuggestionResponse> create(@AuthenticationPrincipal Long userId,
            @PathVariable Long careRecipientId, @PathVariable Long recordId,
            @Valid @RequestBody CreateRecordSuggestionRequest request) {
        return ApiResponse.ok(service.create(userId, careRecipientId, recordId, request));
    }

    @Operation(summary = "생활기록 수정 제안 목록")
    @GetMapping("/record-suggestions")
    public ApiResponse<PaginatedData<RecordSuggestionResponse>> list(@AuthenticationPrincipal Long userId,
            @PathVariable Long careRecipientId,
            @RequestParam(defaultValue = "PENDING") RecordSuggestionStatus status,
            @RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "20") int pageSize) {
        return ApiResponse.ok(service.list(userId, careRecipientId, status, page, pageSize));
    }

    @Operation(summary = "생활기록 수정 제안 승인 또는 거절")
    @PostMapping("/record-suggestions/{suggestionId}/decision")
    public ApiResponse<RecordSuggestionResponse> decide(@AuthenticationPrincipal Long userId,
            @PathVariable Long careRecipientId, @PathVariable Long suggestionId,
            @Valid @RequestBody RecordSuggestionDecisionRequest request) {
        return ApiResponse.ok(service.decide(userId, careRecipientId, suggestionId, request.decision()));
    }
}
