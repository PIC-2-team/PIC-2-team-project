package com.project.backend.record.controller;

import com.project.backend.common.response.ApiResponse;
import com.project.backend.record.dto.CreateRecordRequestRequest;
import com.project.backend.record.dto.RecordRequestResponse;
import com.project.backend.record.service.RecordRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "RecordRequests")
@RestController
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class RecordRequestController {

    private final RecordRequestService recordRequestService;

    @Operation(summary = "기록 요청 생성 (지원사)")
    @PostMapping("/api/care-recipients/{id}/record-requests")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<RecordRequestResponse> create(@AuthenticationPrincipal Long userId,
                                                     @PathVariable Long id,
                                                     @Valid @RequestBody CreateRecordRequestRequest request) {
        return ApiResponse.ok(recordRequestService.create(userId, id, request));
    }

    @Operation(summary = "당사자별 기록 요청 목록 (보호자)")
    @GetMapping("/api/care-recipients/{id}/record-requests")
    public ApiResponse<List<RecordRequestResponse>> getForCareRecipient(@AuthenticationPrincipal Long userId,
                                                                         @PathVariable Long id) {
        return ApiResponse.ok(recordRequestService.getForCareRecipient(userId, id));
    }

    @Operation(summary = "내 기록 요청 목록 (지원사)")
    @GetMapping("/api/record-requests/mine")
    public ApiResponse<List<RecordRequestResponse>> getMine(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(recordRequestService.getMine(userId));
    }

    @Operation(summary = "기록 요청 취소 (지원사)")
    @PostMapping("/api/care-recipients/{id}/record-requests/{reqId}/cancel")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancel(@AuthenticationPrincipal Long userId,
                       @PathVariable Long id,
                       @PathVariable Long reqId) {
        recordRequestService.cancel(userId, reqId);
    }
}
