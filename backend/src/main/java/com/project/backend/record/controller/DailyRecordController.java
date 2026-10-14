package com.project.backend.record.controller;

import com.project.backend.common.response.*;
import com.project.backend.record.dto.*;
import com.project.backend.record.service.DailyRecordService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

@Tag(name = "DailyRecords")
@RestController
@RequestMapping("/api/care-recipients/{careRecipientId}/records")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class DailyRecordController {
    private final DailyRecordService service;

    @Operation(summary = "생활기록 목록")
    @GetMapping
    public ApiResponse<PaginatedData<RecordResponse>> list(@AuthenticationPrincipal Long userId,
            @PathVariable Long careRecipientId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Integer year, @RequestParam(required = false) Integer month,
            @RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "20") int pageSize) {
        return ApiResponse.ok(service.list(userId, careRecipientId, date, year, month, page, pageSize));
    }

    @Operation(summary = "오늘의 생활기록")
    @GetMapping("/today")
    public ApiResponse<List<RecordResponse>> today(@AuthenticationPrincipal Long userId, @PathVariable Long careRecipientId) {
        return ApiResponse.ok(service.today(userId, careRecipientId));
    }

    @Operation(summary = "생활기록 작성")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<RecordResponse> create(@AuthenticationPrincipal Long userId, @PathVariable Long careRecipientId,
                                               @Valid @RequestBody CreateRecordRequest request) {
        return ApiResponse.ok(service.create(userId, careRecipientId, request));
    }

    @Operation(summary = "생활기록 조회")
    @GetMapping("/{recordId}")
    public ApiResponse<RecordResponse> get(@AuthenticationPrincipal Long userId, @PathVariable Long careRecipientId,
                                            @PathVariable Long recordId) {
        return ApiResponse.ok(service.get(userId, careRecipientId, recordId));
    }

    @Operation(summary = "생활기록 수정")
    @PatchMapping("/{recordId}")
    public ApiResponse<RecordResponse> update(@AuthenticationPrincipal Long userId, @PathVariable Long careRecipientId,
            @PathVariable Long recordId, @Valid @RequestBody UpdateRecordRequest request) {
        return ApiResponse.ok(service.update(userId, careRecipientId, recordId, request));
    }

    @Operation(summary = "생활기록 삭제")
    @DeleteMapping("/{recordId}")
    public ApiResponse<DeleteRecordResponse> delete(@AuthenticationPrincipal Long userId, @PathVariable Long careRecipientId,
                                                    @PathVariable Long recordId) {
        return ApiResponse.ok(service.delete(userId, careRecipientId, recordId));
    }

    @Operation(summary = "생활기록 복구")
    @PostMapping("/{recordId}/restore")
    public ApiResponse<RecordResponse> restore(@AuthenticationPrincipal Long userId, @PathVariable Long careRecipientId,
                                                @PathVariable Long recordId) {
        return ApiResponse.ok(service.restore(userId, careRecipientId, recordId));
    }

    @Operation(summary = "생활기록 수정 이력")
    @GetMapping("/{recordId}/revisions")
    public ApiResponse<PaginatedData<RevisionResponse>> revisions(@AuthenticationPrincipal Long userId,
            @PathVariable Long careRecipientId, @PathVariable Long recordId,
            @RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "20") int pageSize) {
        return ApiResponse.ok(service.revisions(userId, careRecipientId, recordId, page, pageSize));
    }

    @Operation(summary = "중요 생활기록 고정")
    @PatchMapping("/{recordId}/pin")
    public ApiResponse<RecordResponse> pin(@AuthenticationPrincipal Long userId, @PathVariable Long careRecipientId,
            @PathVariable Long recordId, @Valid @RequestBody PinRecordRequest request) {
        return ApiResponse.ok(service.pin(userId, careRecipientId, recordId, request.pinned()));
    }
}
