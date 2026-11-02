package com.project.backend.user.service;

import com.project.backend.care.entity.CareAssignment;
import com.project.backend.care.repository.CareAssignmentRepository;
import com.project.backend.organization.entity.Organization;
import com.project.backend.organization.entity.OrganizationMemberStatus;
import com.project.backend.organization.repository.OrganizationMemberRepository;
import com.project.backend.organization.repository.OrganizationRepository;
import com.project.backend.user.entity.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** 활동지원사·기관 탈퇴 시 배정과 기관 연결 정리 (ADR-014). 호출하는 쪽의 트랜잭션 안에서 실행한다. */
@Service
@RequiredArgsConstructor
@Transactional
public class StaffWithdrawalService {
    private final CareAssignmentRepository assignments;
    private final OrganizationMemberRepository members;
    private final OrganizationRepository organizations;

    @Transactional(readOnly = true)
    public int endedAssignmentCount(Long userId, UserRole role) {
        return activeAssignments(userId, role).size();
    }

    public void process(Long userId, UserRole role) {
        activeAssignments(userId, role).forEach(CareAssignment::end);
        if (role == UserRole.SUPPORT_WORKER) {
            // 소속은 목록에서 빠지도록 비활성화한다. 기관의 소속 지원사 기록 자체는 지우지 않는다
            members.findByUserIdAndStatus(userId, OrganizationMemberStatus.ACTIVE)
                    .forEach(com.project.backend.organization.entity.OrganizationMember::deactivate);
        } else if (role == UserRole.INSTITUTION) {
            // 담당자를 비우면 새 담당자가 같은 기관 코드로 인수할 수 있다. 소속 지원사와 당사자 연결은 유지한다
            organizations.findByOwnerId(userId).forEach(org -> org.assignOwner(null));
        }
    }

    // 활성 배정을 먼저 조회한 뒤 소속을 비활성화해야 한다(배정 조회가 활성 소속을 조건으로 한다)
    private List<CareAssignment> activeAssignments(Long userId, UserRole role) {
        if (role == UserRole.SUPPORT_WORKER) {
            return assignments.findBySupportWorkerIdAndEndedAtIsNull(userId);
        }
        if (role == UserRole.INSTITUTION) {
            return organizations.findByOwnerId(userId).stream().map(Organization::getId)
                    .flatMap(orgId -> assignments.findByOrganizationId(orgId).stream())
                    .filter(CareAssignment::isActive).toList();
        }
        return List.of();
    }
}
