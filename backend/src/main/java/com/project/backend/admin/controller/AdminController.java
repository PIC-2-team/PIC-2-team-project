package com.project.backend.admin.controller;

import com.project.backend.admin.dto.AdminStatsResponse;
import com.project.backend.admin.dto.UserSummaryResponse;
import com.project.backend.admin.service.AdminService;
import com.project.backend.common.response.ApiResponse;
import com.project.backend.common.response.PaginatedData;
import com.project.backend.user.entity.UserRole;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

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

    @Operation(summary = "사용자 목록 조회")
    @GetMapping("/users")
    public ApiResponse<PaginatedData<UserSummaryResponse>> getUsers(
            @RequestParam(required = false) UserRole role,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<UserSummaryResponse> result = adminService.getUsers(
                role,
                PageRequest.of(page - 1, size, Sort.by("createdAt").descending()));
        return ApiResponse.ok(new PaginatedData<>(
                result.getContent(),
                new PaginatedData.Pagination(page, size, result.getTotalElements(), result.getTotalPages())));
    }
}
