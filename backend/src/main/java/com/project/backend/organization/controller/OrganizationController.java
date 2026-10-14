package com.project.backend.organization.controller;

import com.project.backend.common.response.ApiResponse;
import com.project.backend.organization.dto.AssignSupportWorkerRequest;
import com.project.backend.organization.dto.CareAssignmentResponse;
import com.project.backend.organization.dto.CreateOrganizationRequest;
import com.project.backend.organization.dto.OrganizationResponse;
import com.project.backend.organization.service.CareAssignmentService;
import com.project.backend.organization.service.OrganizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Organizations")
@RestController
@RequestMapping("/api/organizations")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class OrganizationController {

    private final OrganizationService organizationService;
    private final CareAssignmentService careAssignmentService;

    @Operation(summary = "기관 생성")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<OrganizationResponse> create(@AuthenticationPrincipal Long userId,
                                                     @Valid @RequestBody CreateOrganizationRequest request) {
        return ApiResponse.ok(organizationService.create(userId, request));
    }

    @Operation(summary = "내 기관 조회")
    @GetMapping("/me")
    public ApiResponse<OrganizationResponse> getMyOrganization(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(organizationService.getMyOrganization(userId));
    }

    @Operation(summary = "지원사 배정")
    @PostMapping("/me/assignments")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CareAssignmentResponse> assign(@AuthenticationPrincipal Long userId,
                                                       @Valid @RequestBody AssignSupportWorkerRequest request) {
        OrganizationResponse org = organizationService.getMyOrganization(userId);
        return ApiResponse.ok(careAssignmentService.assign(org.id(), userId, request));
    }
}
