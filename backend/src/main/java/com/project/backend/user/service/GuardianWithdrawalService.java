package com.project.backend.user.service;

import com.project.backend.care.entity.*;
import com.project.backend.care.repository.CareAssignmentRepository;
import com.project.backend.care.repository.CareGuardianRepository;
import com.project.backend.care.repository.CareRecipientRepository;
import com.project.backend.common.exception.ApiException;
import com.project.backend.notification.service.NotificationService;
import com.project.backend.organization.entity.LinkStatus;
import com.project.backend.organization.entity.Organization;
import com.project.backend.organization.entity.OrganizationRecipientLink;
import com.project.backend.organization.repository.OrganizationRecipientLinkRepository;
import com.project.backend.organization.repository.OrganizationRepository;
import com.project.backend.user.dto.WithdrawRequest;
import com.project.backend.user.dto.WithdrawalPreviewResponse;
import com.project.backend.user.dto.WithdrawalPreviewResponse.Resolution;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/** 보호자 탈퇴 시 당사자별 처리 (ADR-014). 호출하는 쪽의 트랜잭션 안에서 실행한다. */
@Service
@RequiredArgsConstructor
@Transactional
public class GuardianWithdrawalService {
    private static final String DECISION_MESSAGE = "당사자별 이관·삭제 선택이 올바르지 않습니다.";

    private final CareGuardianRepository guardians;
    private final CareRecipientRepository recipients;
    private final CareAssignmentRepository assignments;
    private final OrganizationRecipientLinkRepository links;
    private final OrganizationRepository organizations;
    private final NotificationService notifications;

    @Transactional(readOnly = true)
    public WithdrawalPreviewResponse preview(Long userId) {
        Map<Long, Resolution> plan = plan(userId);
        Map<Long, String> names = recipients.findAllById(plan.keySet()).stream()
                .collect(Collectors.toMap(CareRecipient::getId, CareRecipient::getName));
        List<WithdrawalPreviewResponse.Item> items = plan.entrySet().stream()
                .map(e -> new WithdrawalPreviewResponse.Item(e.getKey(), names.get(e.getKey()), e.getValue()))
                .toList();
        return new WithdrawalPreviewResponse(items, 0);
    }

    public void process(Long userId, WithdrawRequest request, LocalDateTime now) {
        // 주 보호자와 세컨드가 동시에 탈퇴해도 계획이 서로 어긋나지 않도록 관련 당사자를 id 순서로 잠근다
        guardians.findLiveByGuardianIdForUpdate(userId).stream()
                .map(CareGuardian::getCareRecipientId).distinct().sorted()
                .forEach(recipients::findForUpdate);
        Map<Long, Resolution> plan = plan(userId);
        Map<Long, WithdrawRequest.Action> decisions = decisions(request, plan);

        // 일부만 반영되지 않도록 모든 선택을 먼저 검증한다
        for (Map.Entry<Long, Resolution> entry : plan.entrySet()) {
            WithdrawRequest.Action action = decisions.get(entry.getKey());
            // 자동 승계되는 당사자에 보낸 삭제 의사를 조용히 버리지 않는다
            if (entry.getValue() == Resolution.SUCCESSION && action != null) throw invalid(DECISION_MESSAGE);
            if (entry.getValue() == Resolution.CHOICE && action == null) throw invalid(DECISION_MESSAGE);
            if (entry.getValue() == Resolution.DELETE_ONLY && action != WithdrawRequest.Action.DELETE) {
                throw invalid(DECISION_MESSAGE);
            }
        }
        for (Map.Entry<Long, Resolution> entry : plan.entrySet()) {
            Long recipientId = entry.getKey();
            if (entry.getValue() == Resolution.SUCCESSION) {
                succeed(recipientId, userId);
            } else if (decisions.get(recipientId) == WithdrawRequest.Action.TRANSFER) {
                transfer(recipientId, now);
            } else {
                softDelete(recipientId, now);
            }
        }
        // 세컨드·초대 대기 연결도 포함해 탈퇴자의 연결을 모두 끊는다. 남겨 두면 이후 승계 대상으로 잘못 잡힌다.
        guardians.findByGuardianId(userId).stream()
                .filter(g -> g.getStatus() != GuardianStatus.REVOKED).forEach(CareGuardian::revoke);
    }

    private Map<Long, Resolution> plan(Long userId) {
        List<CareGuardian> primaries = guardians.findByGuardianIdAndStatus(userId, GuardianStatus.ACTIVE).stream()
                .filter(g -> g.getType() == GuardianType.PRIMARY).toList();
        Map<Long, Resolution> plan = new LinkedHashMap<>();
        for (CareGuardian primary : primaries) {
            Long recipientId = primary.getCareRecipientId();
            if (activeSecondary(recipientId, userId).isPresent()) {
                plan.put(recipientId, Resolution.SUCCESSION);
            } else if (!linkedOrganizations(recipientId).isEmpty()) {
                plan.put(recipientId, Resolution.CHOICE);
            } else {
                plan.put(recipientId, Resolution.DELETE_ONLY);
            }
        }
        return plan;
    }

    private Map<Long, WithdrawRequest.Action> decisions(WithdrawRequest request, Map<Long, Resolution> plan) {
        Map<Long, WithdrawRequest.Action> decisions = new HashMap<>();
        for (WithdrawRequest.Decision d : request == null ? List.<WithdrawRequest.Decision>of() : request.decisionsOrEmpty()) {
            if (d == null || d.careRecipientId() == null || d.action() == null
                    || !plan.containsKey(d.careRecipientId())
                    || decisions.put(d.careRecipientId(), d.action()) != null) {
                throw invalid(DECISION_MESSAGE);
            }
        }
        return decisions;
    }

    private void succeed(Long recipientId, Long userId) {
        activeSecondary(recipientId, userId).orElseThrow().promoteToPrimary();
    }

    private void transfer(Long recipientId, LocalDateTime now) {
        CareRecipient recipient = recipients.findById(recipientId).orElseThrow();
        recipient.transfer(now);
        // 이관된 당사자에는 보호자가 없어야 하므로 초대 대기 중인 세컨드도 철회한다
        revokeGuardians(recipientId);
        List<Long> orgIds = linkedOrganizations(recipientId).stream()
                .map(OrganizationRecipientLink::getOrganizationId).toList();
        for (Organization org : organizations.findAllById(orgIds)) {
            if (org.getOwnerId() != null) {
                notifications.notifyAssignmentChanged(org.getOwnerId(),
                        "보호자 탈퇴로 '" + recipient.getName() + "' 님의 정보가 기관에 이관되었습니다.");
            }
        }
    }

    private void softDelete(Long recipientId, LocalDateTime now) {
        recipients.findById(recipientId).orElseThrow().softDelete(now);
        assignments.findByCareRecipientIdAndEndedAtIsNull(recipientId).forEach(CareAssignment::end);
        // 기관 접근 확인은 연결 상태만 보므로, 유예 중에는 연결을 거절 상태로 돌려 접근을 막는다 (복원은 운영자가 연결을 되살린다)
        links.findByCareRecipientId(recipientId).stream()
                .filter(link -> link.getStatus() != LinkStatus.REJECTED).forEach(OrganizationRecipientLink::reject);
        revokeGuardians(recipientId);
    }

    private void revokeGuardians(Long recipientId) {
        for (GuardianStatus status : List.of(GuardianStatus.ACTIVE, GuardianStatus.PENDING)) {
            guardians.findByCareRecipientIdAndStatus(recipientId, status).forEach(CareGuardian::revoke);
        }
    }

    private Optional<CareGuardian> activeSecondary(Long recipientId, Long excludedUserId) {
        return guardians.findByCareRecipientIdAndStatus(recipientId, GuardianStatus.ACTIVE).stream()
                .filter(g -> g.getType() == GuardianType.SECONDARY && !g.getGuardianId().equals(excludedUserId))
                .min(Comparator.comparing(CareGuardian::getCreatedAt).thenComparing(CareGuardian::getId));
    }

    private List<OrganizationRecipientLink> linkedOrganizations(Long recipientId) {
        return links.findByCareRecipientIdInAndStatus(List.of(recipientId), LinkStatus.ACCEPTED);
    }

    private ApiException invalid(String message) {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "WITHDRAWAL_DECISION_INVALID", message);
    }
}
