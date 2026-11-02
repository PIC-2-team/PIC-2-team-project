package com.project.backend.memo.controller;

import com.project.backend.common.response.ApiResponse;
import com.project.backend.memo.dto.*;
import com.project.backend.memo.service.CareMemoService;
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

@Tag(name = "Memos")
@RestController
@RequestMapping("/api/care-recipients/{careRecipientId}/memos")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class CareMemoController {
    private final CareMemoService service;

    @Operation(summary = "날짜별 메모 목록")
    @GetMapping
    public ApiResponse<List<MemoResponse>> listByDate(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long careRecipientId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ApiResponse.ok(service.listByDate(userId, careRecipientId, date));
    }

    @Operation(summary = "월별 메모 목록")
    @GetMapping("/month")
    public ApiResponse<List<MemoResponse>> listByMonth(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long careRecipientId,
            @RequestParam int year,
            @RequestParam int month) {
        return ApiResponse.ok(service.listByMonth(userId, careRecipientId, year, month));
    }

    @Operation(summary = "오늘의 메모 목록")
    @GetMapping("/today")
    public ApiResponse<List<MemoResponse>> listToday(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long careRecipientId) {
        return ApiResponse.ok(service.listToday(userId, careRecipientId));
    }

    @Operation(summary = "메모 생성")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<MemoResponse> create(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long careRecipientId,
            @Valid @RequestBody CreateMemoRequest request) {
        return ApiResponse.ok(service.create(userId, careRecipientId, request));
    }

    @Operation(summary = "메모 수정")
    @PatchMapping("/{memoId}")
    public ApiResponse<MemoResponse> update(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long careRecipientId,
            @PathVariable Long memoId,
            @Valid @RequestBody UpdateMemoRequest request) {
        return ApiResponse.ok(service.update(userId, careRecipientId, memoId, request));
    }

    @Operation(summary = "메모 삭제")
    @DeleteMapping("/{memoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long careRecipientId,
            @PathVariable Long memoId) {
        service.delete(userId, careRecipientId, memoId);
    }
}
