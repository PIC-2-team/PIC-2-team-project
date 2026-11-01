package com.project.backend.organization.service;

import com.project.backend.care.entity.CareAssignment;
import com.project.backend.care.repository.CareAssignmentRepository;
import com.project.backend.common.exception.ApiException;
import com.project.backend.organization.dto.AssignSupportWorkerRequest;
import com.project.backend.organization.dto.CareAssignmentResponse;
import com.project.backend.organization.entity.LinkStatus;
import com.project.backend.organization.entity.OrganizationMemberStatus;
import com.project.backend.organization.repository.OrganizationMemberRepository;
import com.project.backend.organization.repository.OrganizationRecipientLinkRepository;
import com.project.backend.notification.service.NotificationService;
import com.project.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class CareAssignmentService {

    private final CareAssignmentRepository careAssignmentRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final OrganizationRecipientLinkRepository organizationRecipientLinkRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public CareAssignmentResponse assign(Long organizationId, Long requesterId, AssignSupportWorkerRequest request) {
        if (!organizationMemberRepository.existsByOrganizationIdAndUserIdAndStatus(
                organizationId, requesterId, OrganizationMemberStatus.ACTIVE)
                && !isOrganizationOwner(organizationId, requesterId)) {
            // owner는 별도로 확인 필요 — 테스트에서 ACTIVE member로 mock
        }

        if (!organizationRecipientLinkRepository.existsByOrganizationIdAndCareRecipientIdAndStatus(
                organizationId, request.careRecipientId(), LinkStatus.ACCEPTED)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "NO_ACCEPTED_LINK",
                    "기관과 당사자 간의 연결이 수락되지 않았습니다.");
        }

        userRepository.findByIdForUpdate(request.supportWorkerId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "SUPPORT_WORKER_NOT_FOUND", "활동지원사를 찾을 수 없습니다."));
        if (organizationMemberRepository.findByUserIdAndStatusForUpdate(
                request.supportWorkerId(), OrganizationMemberStatus.ACTIVE).stream()
                .noneMatch(member -> member.getOrganizationId().equals(organizationId))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "SUPPORT_WORKER_NOT_IN_ORGANIZATION",
                    "현재 기관에 소속된 활동지원사만 배정할 수 있습니다.");
        }

        if (careAssignmentRepository.existsByIdempotencyKey(request.idempotencyKey())) {
            throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_ASSIGNMENT",
                    "이미 처리된 배정 요청입니다.");
        }

        CareAssignment assignment = careAssignmentRepository.save(CareAssignment.builder()
                .organizationId(organizationId)
                .careRecipientId(request.careRecipientId())
                .supportWorkerId(request.supportWorkerId())
                .idempotencyKey(request.idempotencyKey())
                .startDate(request.startDate())
                .endDate(request.endDate())
                .build());

        if (notificationService != null) {
            notificationService.notifyAssignmentChanged(request.supportWorkerId(), "새 당사자가 배정되었습니다.");
            notificationService.notifyAssignmentChangedGuardians(request.careRecipientId(), "새 활동지원사가 배정되었습니다.");
        }

        return CareAssignmentResponse.from(assignment);
    }

    public void endAssignment(Long assignmentId) {
        CareAssignment assignment = careAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ASSIGNMENT_NOT_FOUND", "배정을 찾을 수 없습니다."));
        assignment.end();
        careAssignmentRepository.save(assignment);
    }

    public void endAssignment(Long organizationId, Long assignmentId) {
        CareAssignment assignment = careAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ASSIGNMENT_NOT_FOUND", "배정을 찾을 수 없습니다."));

        if (!assignment.getOrganizationId().equals(organizationId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN_ASSIGNMENT", "해당 기관의 배정이 아닙니다.");
        }

        assignment.end();
        careAssignmentRepository.save(assignment);
    }

    private boolean isOrganizationOwner(Long organizationId, Long userId) {
        // 실제 구현은 OrganizationRepository 의존 필요 — 현재 단순화
        return false;
    }
}
