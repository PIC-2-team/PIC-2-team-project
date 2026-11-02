package com.project.backend.user.service;

import com.project.backend.care.entity.CareAssignment;
import com.project.backend.care.repository.CareAssignmentRepository;
import com.project.backend.organization.entity.Organization;
import com.project.backend.organization.entity.OrganizationMember;
import com.project.backend.organization.entity.OrganizationMemberStatus;
import com.project.backend.organization.repository.OrganizationMemberRepository;
import com.project.backend.organization.repository.OrganizationRepository;
import com.project.backend.user.entity.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;

/** 활동지원사·기관 탈퇴 시 배정과 기관 연결 정리 (ADR-014). 호출하는 쪽의 트랜잭션 안에서 실행한다. */
@Service
@RequiredArgsConstructor
@Transactional
public class StaffWithdrawalService {
    // 어드민이 발급하는 기관 코드와 같은 형식(6자리 영숫자)
    private static final String CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int CODE_LENGTH = 6;
    private static final SecureRandom RANDOM = new SecureRandom();

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
                    .forEach(OrganizationMember::deactivate);
        } else if (role == UserRole.INSTITUTION) {
            // 담당자를 비우면 기관 코드만 아는 누구든 인수할 수 있으므로 코드를 재발급해 이전 코드를 무효화한다.
            // 슈퍼 어드민이 새 코드를 후임에게 전달한다. 소속 지원사와 당사자 연결은 유지한다 (ADR-014)
            organizations.findByOwnerId(userId).forEach(org -> {
                org.assignOwner(null);
                org.changeCode(newUniqueCode());
            });
        }
    }

    private String newUniqueCode() {
        String code;
        do {
            StringBuilder sb = new StringBuilder(CODE_LENGTH);
            for (int i = 0; i < CODE_LENGTH; i++) sb.append(CODE_CHARS.charAt(RANDOM.nextInt(CODE_CHARS.length())));
            code = sb.toString();
        } while (organizations.existsByOrganizationCode(code));
        return code;
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
