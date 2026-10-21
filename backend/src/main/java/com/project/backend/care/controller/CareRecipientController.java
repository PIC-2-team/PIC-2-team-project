package com.project.backend.care.controller;

import com.project.backend.care.dto.*;
import com.project.backend.care.service.CareRecipientService;
import com.project.backend.care.service.SecondaryGuardianService;
import com.project.backend.common.response.ApiResponse;
import com.project.backend.organization.service.OrganizationService;

import java.util.List;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "CareRecipients")
@RestController
@RequestMapping("/api/care-recipients")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class CareRecipientController {

    private final CareRecipientService careRecipientService;
    private final SecondaryGuardianService secondaryGuardianService;
    private final OrganizationService organizationService;

    @Operation(summary = "내 당사자 목록 조회")
    @GetMapping
    public ApiResponse<List<CareRecipientResponse>> getAll(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(careRecipientService.getAll(userId));
    }

    @Operation(summary = "당사자 등록")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CareRecipientResponse> register(@AuthenticationPrincipal Long userId,
                                                        @Valid @RequestBody CreateCareRecipientRequest request) {
        return ApiResponse.ok(careRecipientService.register(userId, request));
    }

    @Operation(summary = "당사자 조회")
    @GetMapping("/{id}")
    public ApiResponse<CareRecipientResponse> getById(@AuthenticationPrincipal Long userId,
                                                       @PathVariable Long id) {
        return ApiResponse.ok(careRecipientService.getById(userId, id));
    }

    @Operation(summary = "당사자 정보 수정")
    @PatchMapping("/{id}")
    public ApiResponse<CareRecipientResponse> update(@AuthenticationPrincipal Long userId,
                                                      @PathVariable Long id,
                                                      @RequestBody UpdateCareRecipientRequest request) {
        return ApiResponse.ok(careRecipientService.update(userId, id, request));
    }

    @Operation(summary = "기관 연결 요청")
    @PostMapping("/{id}/organization-link-requests")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Void> requestLink(@AuthenticationPrincipal Long userId,
                                          @PathVariable Long id,
                                          @Valid @RequestBody LinkRecipientRequest request) {
        organizationService.requestRecipientLink(userId, id, request.organizationCode());
        return ApiResponse.ok(null);
    }

    @Operation(summary = "기관 연결 요청 수락/거절")
    @PostMapping("/{id}/organization-link-requests/{linkId}/{decision}")
    public ApiResponse<Void> decideLinkRequest(@AuthenticationPrincipal Long userId,
                                                @PathVariable Long id,
                                                @PathVariable Long linkId,
                                                @PathVariable String decision) {
        boolean accepted = "accept".equalsIgnoreCase(decision);
        organizationService.decideLinkRequest(userId, linkId, accepted);
        return ApiResponse.ok(null);
    }

    @Operation(summary = "세컨드 보호자 초대")
    @PutMapping("/{id}/secondary-guardian")
    public ApiResponse<SecondaryGuardianResponse> inviteSecondaryGuardian(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id,
            @Valid @RequestBody InviteSecondaryGuardianRequest request) {
        return ApiResponse.ok(secondaryGuardianService.invite(userId, id, request));
    }

    @Operation(summary = "세컨드 보호자 조회")
    @GetMapping("/{id}/secondary-guardian")
    public ApiResponse<SecondaryGuardianResponse> getSecondaryGuardian(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id) {
        return ApiResponse.ok(secondaryGuardianService.getSecondaryGuardian(userId, id).orElse(null));
    }

    @Operation(summary = "세컨드 보호자 해제")
    @DeleteMapping("/{id}/secondary-guardian")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revokeSecondaryGuardian(@AuthenticationPrincipal Long userId,
                                        @PathVariable Long id) {
        secondaryGuardianService.revokeSecondaryGuardian(userId, id);
    }

    @Operation(summary = "당사자 돌봄 관계(기관 및 활동지원사) 조회")
    @GetMapping("/{id}/relations")
    public ApiResponse<CareRelationsResponse> getRelations(@AuthenticationPrincipal Long userId,
                                                           @PathVariable Long id) {
        return ApiResponse.ok(careRecipientService.getRelations(userId, id));
    }
}
