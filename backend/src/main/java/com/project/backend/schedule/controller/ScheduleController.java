package com.project.backend.schedule.controller;

import com.project.backend.common.response.ApiResponse;
import com.project.backend.schedule.dto.*;
import com.project.backend.schedule.service.ScheduleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@Tag(name = "Schedules")
@RestController
@RequestMapping("/api/care-recipients/{careRecipientId}/schedules")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class ScheduleController {
    private final ScheduleService service;

    @Operation(summary = "월별 일정 목록")
    @GetMapping
    public ApiResponse<List<ScheduleResponse>> list(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long careRecipientId,
            @RequestParam int year,
            @RequestParam int month) {
        return ApiResponse.ok(service.listByMonth(userId, careRecipientId, year, month));
    }

    @Operation(summary = "일정 생성")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ScheduleResponse> create(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long careRecipientId,
            @Valid @RequestBody CreateScheduleRequest request) {
        return ApiResponse.ok(service.create(userId, careRecipientId, request));
    }

    @Operation(summary = "일정 수정")
    @PatchMapping("/{scheduleId}")
    public ApiResponse<ScheduleResponse> update(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long careRecipientId,
            @PathVariable Long scheduleId,
            @Valid @RequestBody UpdateScheduleRequest request) {
        return ApiResponse.ok(service.update(userId, careRecipientId, scheduleId, request));
    }

    @Operation(summary = "일정 삭제")
    @DeleteMapping("/{scheduleId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long careRecipientId,
            @PathVariable Long scheduleId) {
        service.delete(userId, careRecipientId, scheduleId);
    }
}
