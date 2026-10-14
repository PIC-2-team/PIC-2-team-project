package com.project.backend.information.controller;

import com.project.backend.common.response.ApiResponse;
import com.project.backend.common.response.PaginatedData;
import com.project.backend.information.dto.InformationRequestRequest;
import com.project.backend.information.dto.InformationRequestResponse;
import com.project.backend.information.entity.InformationRequestStatus;
import com.project.backend.information.service.InformationRequestService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "InformationRequests")
@RestController
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class InformationRequestController {
    private final InformationRequestService service;

    @PostMapping("/api/care-recipients/{careRecipientId}/information-requests")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<InformationRequestResponse> create(@AuthenticationPrincipal Long userId,
            @PathVariable Long careRecipientId, @Valid @RequestBody InformationRequestRequest request) {
        return ApiResponse.ok(service.create(userId, careRecipientId, request));
    }

    @GetMapping("/api/information-requests")
    public ApiResponse<PaginatedData<InformationRequestResponse>> requester(@AuthenticationPrincipal Long userId,
            @RequestParam(required = false) InformationRequestStatus status,
            @RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "20") int pageSize) {
        return ApiResponse.ok(service.listRequester(userId, status, page, pageSize));
    }

    @GetMapping("/api/organizations/me/information-requests")
    public ApiResponse<PaginatedData<InformationRequestResponse>> organization(@AuthenticationPrincipal Long userId,
            @RequestParam(required = false) InformationRequestStatus status,
            @RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "20") int pageSize) {
        return ApiResponse.ok(service.listOrganization(userId, status, page, pageSize));
    }

    @PostMapping("/api/organizations/me/information-requests/{requestId}/forward")
    public ApiResponse<InformationRequestResponse> forward(@AuthenticationPrincipal Long userId, @PathVariable Long requestId) {
        return ApiResponse.ok(service.forward(userId, requestId));
    }

    @GetMapping("/api/care-recipients/{careRecipientId}/information-requests")
    public ApiResponse<PaginatedData<InformationRequestResponse>> guardian(@AuthenticationPrincipal Long userId,
            @PathVariable Long careRecipientId, @RequestParam(required = false) InformationRequestStatus status,
            @RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "20") int pageSize) {
        return ApiResponse.ok(service.listGuardian(userId, careRecipientId, status, page, pageSize));
    }

    @PostMapping("/api/care-recipients/{careRecipientId}/information-requests/{requestId}/reply")
    public ApiResponse<InformationRequestResponse> reply(@AuthenticationPrincipal Long userId,
            @PathVariable Long careRecipientId, @PathVariable Long requestId,
            @Valid @RequestBody InformationRequestRequest request) {
        return ApiResponse.ok(service.reply(userId, careRecipientId, requestId, request));
    }

    @PostMapping("/api/organizations/me/information-requests/{requestId}/close")
    public ApiResponse<InformationRequestResponse> close(@AuthenticationPrincipal Long userId, @PathVariable Long requestId) {
        return ApiResponse.ok(service.close(userId, requestId));
    }
}
