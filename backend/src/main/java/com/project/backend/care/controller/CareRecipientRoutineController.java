package com.project.backend.care.controller;

import com.project.backend.care.dto.RoutineRequest;
import com.project.backend.care.dto.RoutineResponse;
import com.project.backend.care.service.CareRecipientRoutineService;
import com.project.backend.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Care Recipient Routines")
@RestController
@RequestMapping("/api/care-recipients/{careRecipientId}/routines")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class CareRecipientRoutineController {
    private final CareRecipientRoutineService service;

    @Operation(summary = "루틴 목록 (시간순)")
    @GetMapping
    public ApiResponse<List<RoutineResponse>> list(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long careRecipientId) {
        return ApiResponse.ok(service.list(userId, careRecipientId));
    }

    @Operation(summary = "루틴 추가")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<RoutineResponse> create(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long careRecipientId,
            @Valid @RequestBody RoutineRequest request) {
        return ApiResponse.ok(service.create(userId, careRecipientId, request));
    }

    @Operation(summary = "루틴 수정")
    @PutMapping("/{routineId}")
    public ApiResponse<RoutineResponse> update(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long careRecipientId,
            @PathVariable Long routineId,
            @Valid @RequestBody RoutineRequest request) {
        return ApiResponse.ok(service.update(userId, careRecipientId, routineId, request));
    }

    @Operation(summary = "루틴 삭제")
    @DeleteMapping("/{routineId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long careRecipientId,
            @PathVariable Long routineId) {
        service.delete(userId, careRecipientId, routineId);
    }
}
