package com.project.backend.admin.controller;

import com.project.backend.admin.dto.*;
import com.project.backend.admin.service.AdminService;
import com.project.backend.common.response.ApiResponse;
import com.project.backend.common.response.PaginatedData;
import com.project.backend.user.entity.UserRole;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Admin")
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class AdminController {

    private final AdminService adminService;

    @Operation(summary = "전체 통계 조회")
    @GetMapping("/stats")
    public ApiResponse<AdminStatsResponse> getStats() {
        return ApiResponse.ok(adminService.getStats());
    }

    @Operation(summary = "사용자 목록 조회 (역할 및 기관 필터 지원)")
    @GetMapping("/users")
    public ApiResponse<PaginatedData<UserSummaryResponse>> getUsers(
            @RequestParam(required = false) UserRole role,
            @RequestParam(required = false) Long organizationId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<UserSummaryResponse> result = adminService.getUsers(
                role,
                organizationId,
                PageRequest.of(page - 1, size, Sort.by("createdAt").descending()));
        return ApiResponse.ok(new PaginatedData<>(
                result.getContent(),
                new PaginatedData.Pagination(page, size, result.getTotalElements(), result.getTotalPages())));
    }

    @Operation(summary = "신규 사용자 등록")
    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<UserSummaryResponse> createUser(
            @Valid @RequestBody CreateAdminUserRequest request) {
        return ApiResponse.ok(adminService.createUser(request));
    }

    @Operation(summary = "사용자 정보 수정")
    @PatchMapping("/users/{id}")
    public ApiResponse<UserSummaryResponse> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateAdminUserRequest request) {
        return ApiResponse.ok(adminService.updateUser(id, request));
    }

    @Operation(summary = "사용자 삭제")
    @DeleteMapping("/users/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ApiResponse<Void> deleteUser(
            @PathVariable Long id,
            @AuthenticationPrincipal Long currentAdminId) {
        adminService.deleteUser(id, currentAdminId);
        return ApiResponse.ok(null);
    }

    @Operation(summary = "특정 사용자의 생활기록 조회")
    @GetMapping("/users/{id}/records")
    public ApiResponse<List<AdminRecordSummaryResponse>> getUserRecords(@PathVariable Long id) {
        return ApiResponse.ok(adminService.getUserRecords(id));
    }

    @Operation(summary = "기관 생성 (6자리 코드 발급)")
    @PostMapping("/organizations")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AdminOrganizationResponse> createOrganization(
            @Valid @RequestBody CreateAdminOrganizationRequest request) {
        return ApiResponse.ok(adminService.createOrganization(request));
    }

    @Operation(summary = "기관 이름 수정")
    @PatchMapping("/organizations/{id}")
    public ApiResponse<AdminOrganizationResponse> updateOrganization(
            @PathVariable Long id,
            @Valid @RequestBody UpdateAdminOrganizationRequest request) {
        return ApiResponse.ok(adminService.updateOrganization(id, request));
    }

    @Operation(summary = "기관 삭제")
    @DeleteMapping("/organizations/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ApiResponse<Void> deleteOrganization(@PathVariable Long id) {
        adminService.deleteOrganization(id);
        return ApiResponse.ok(null);
    }

    @Operation(summary = "기관 목록 조회")
    @GetMapping("/organizations")
    public ApiResponse<List<AdminOrganizationResponse>> getOrganizations() {
        return ApiResponse.ok(adminService.getOrganizations());
    }

    @Operation(summary = "특정 기관의 생활기록 조회")
    @GetMapping("/organizations/{id}/records")
    public ApiResponse<List<AdminRecordSummaryResponse>> getOrganizationRecords(@PathVariable Long id) {
        return ApiResponse.ok(adminService.getOrganizationRecords(id));
    }
}
