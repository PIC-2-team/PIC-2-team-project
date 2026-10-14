package com.project.backend.organization.controller;

import com.project.backend.common.response.ApiResponse;
import com.project.backend.organization.dto.*;
import com.project.backend.organization.service.CareAssignmentService;
import com.project.backend.organization.service.OrganizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.lang.Nullable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    @Operation(summary = "소속 지원사 목록 조회")
    @GetMapping("/me/members")
    public ApiResponse<List<MemberResponse>> getMembers(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(organizationService.getMembers(userId));
    }

    @Operation(summary = "소속 지원사 상세 조회")
    @GetMapping("/me/members/{memberId}")
    public ApiResponse<MemberResponse> getMember(@AuthenticationPrincipal Long userId,
                                                  @PathVariable Long memberId) {
        return ApiResponse.ok(organizationService.getMember(userId, memberId));
    }

    @Operation(summary = "지원사 상태 변경")
    @PatchMapping("/me/members/{memberId}")
    public ApiResponse<MemberResponse> updateMemberStatus(@AuthenticationPrincipal Long userId,
                                                           @PathVariable Long memberId,
                                                           @RequestBody UpdateMemberStatusRequest request) {
        return ApiResponse.ok(organizationService.updateMemberStatus(userId, memberId, request.active()));
    }

    @Operation(summary = "배정 목록 조회")
    @GetMapping("/me/assignments")
    public ApiResponse<List<CareAssignmentResponse>> getAssignments(@AuthenticationPrincipal Long userId,
                                                                     @RequestParam @Nullable Long careRecipientId) {
        return ApiResponse.ok(organizationService.getAssignments(userId, careRecipientId));
    }

    @Operation(summary = "연결 요청 목록 조회")
    @GetMapping("/me/link-requests")
    public ApiResponse<List<LinkRequestResponse>> getLinkRequests(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(organizationService.getLinkRequests(userId));
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
