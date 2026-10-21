package com.project.backend.organization.controller;

import com.project.backend.care.dto.CareRecipientResponse;
import com.project.backend.care.dto.CreateCareRecipientRequest;
import com.project.backend.care.dto.UpdateCareRecipientRequest;
import com.project.backend.care.service.CareRecipientService;
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
    private final CareRecipientService careRecipientService;

    @Operation(summary = "기관 등록 (6자리 코드)")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<OrganizationResponse> register(@AuthenticationPrincipal Long userId,
                                                       @Valid @RequestBody RegisterOrganizationRequest request) {
        return ApiResponse.ok(organizationService.register(userId, request));
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

    @Operation(summary = "지원사 추가")
    @PostMapping("/me/members")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<MemberResponse> addMember(@AuthenticationPrincipal Long userId,
                                                  @Valid @RequestBody AddMemberRequest request) {
        return ApiResponse.ok(organizationService.addMember(userId, request.userId()));
    }

    @Operation(summary = "지원사 상태 변경")
    @PatchMapping("/me/members/{memberId}")
    public ApiResponse<MemberResponse> updateMemberStatus(@AuthenticationPrincipal Long userId,
                                                           @PathVariable Long memberId,
                                                           @Valid @RequestBody UpdateMemberStatusRequest request) {
        return ApiResponse.ok(organizationService.updateMemberStatus(userId, memberId, request.active()));
    }

    @Operation(summary = "지원사 삭제 (소속 해제)")
    @DeleteMapping("/me/members/{memberId}")
    public ApiResponse<Void> removeMember(@AuthenticationPrincipal Long userId,
                                          @PathVariable Long memberId) {
        organizationService.removeMember(userId, memberId);
        return ApiResponse.ok(null);
    }

    @Operation(summary = "기관 소속 돌봄 대상자 목록 조회")
    @GetMapping("/me/recipients")
    public ApiResponse<List<CareRecipientResponse>> getRecipients(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(careRecipientService.getOrganizationRecipients(userId));
    }

    @Operation(summary = "기관 돌봄 대상자 등록")
    @PostMapping("/me/recipients")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CareRecipientResponse> registerRecipient(@AuthenticationPrincipal Long userId,
                                                                 @Valid @RequestBody CreateCareRecipientRequest request) {
        return ApiResponse.ok(careRecipientService.registerByOrganization(userId, request));
    }

    @Operation(summary = "기관 돌봄 대상자 정보 수정")
    @PatchMapping("/me/recipients/{recipientId}")
    public ApiResponse<CareRecipientResponse> updateRecipient(@AuthenticationPrincipal Long userId,
                                                               @PathVariable Long recipientId,
                                                               @RequestBody UpdateCareRecipientRequest request) {
        return ApiResponse.ok(careRecipientService.updateByOrganization(userId, recipientId, request));
    }

    @Operation(summary = "기관 돌봄 대상자 삭제 (연결 해제)")
    @DeleteMapping("/me/recipients/{recipientId}")
    public ApiResponse<Void> deleteRecipient(@AuthenticationPrincipal Long userId,
                                             @PathVariable Long recipientId) {
        careRecipientService.deleteByOrganization(userId, recipientId);
        return ApiResponse.ok(null);
    }

    @Operation(summary = "배정 목록 조회")
    @GetMapping("/me/assignments")
    public ApiResponse<List<CareAssignmentResponse>> getAssignments(@AuthenticationPrincipal Long userId,
                                                                     @RequestParam(required = false) Long careRecipientId) {
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

    @Operation(summary = "지원사 배정 종료")
    @PatchMapping("/me/assignments/{assignmentId}/end")
    public ApiResponse<Void> endAssignment(@AuthenticationPrincipal Long userId,
                                            @PathVariable Long assignmentId) {
        OrganizationResponse org = organizationService.getMyOrganization(userId);
        careAssignmentService.endAssignment(org.id(), assignmentId);
        return ApiResponse.ok(null);
    }
}
