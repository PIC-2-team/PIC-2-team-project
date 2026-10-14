package com.project.backend.care.service;

import com.project.backend.care.entity.GuardianStatus;
import com.project.backend.care.repository.CareAssignmentRepository;
import com.project.backend.care.repository.CareGuardianRepository;
import com.project.backend.common.exception.ApiException;
import com.project.backend.organization.entity.LinkStatus;
import com.project.backend.organization.entity.OrganizationMemberStatus;
import com.project.backend.organization.repository.OrganizationMemberRepository;
import com.project.backend.organization.repository.OrganizationRecipientLinkRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CareAccessService {

    private final CareGuardianRepository careGuardianRepository;
    private final CareAssignmentRepository careAssignmentRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final OrganizationRecipientLinkRepository organizationRecipientLinkRepository;

    public boolean hasAccess(Long userId, Long careRecipientId) {
        // 1. 활성 보호자 (PRIMARY 또는 SECONDARY)
        if (careGuardianRepository.existsByCareRecipientIdAndGuardianIdAndStatus(
                careRecipientId, userId, GuardianStatus.ACTIVE)) {
            return true;
        }

        // 2. 활성 배정 지원사
        if (careAssignmentRepository.existsBySupportWorkerIdAndCareRecipientIdAndEndedAtIsNull(
                userId, careRecipientId)) {
            return true;
        }

        // 3. 수락된 링크를 보유한 기관의 활성 멤버
        return organizationMemberRepository
                .findByUserIdAndStatus(userId, OrganizationMemberStatus.ACTIVE)
                .stream()
                .anyMatch(member -> organizationRecipientLinkRepository
                        .existsByOrganizationIdAndCareRecipientIdAndStatus(
                                member.getOrganizationId(), careRecipientId, LinkStatus.ACCEPTED));
    }

    public void verifyAccess(Long userId, Long careRecipientId) {
        if (!hasAccess(userId, careRecipientId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "접근 권한이 없습니다.");
        }
    }
}
