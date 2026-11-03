package com.project.backend.care.service;

import com.project.backend.care.dto.ClaimPendingResponse;
import com.project.backend.care.dto.GuardianClaimResponse;
import com.project.backend.care.entity.CareGuardian;
import com.project.backend.care.entity.CareRecipient;
import com.project.backend.care.entity.GuardianStatus;
import com.project.backend.care.entity.GuardianType;
import com.project.backend.care.repository.CareGuardianRepository;
import com.project.backend.care.repository.CareRecipientRepository;
import com.project.backend.common.exception.ApiException;
import com.project.backend.notification.service.NotificationService;
import com.project.backend.organization.entity.LinkStatus;
import com.project.backend.organization.entity.Organization;
import com.project.backend.organization.entity.OrganizationRecipientLink;
import com.project.backend.organization.repository.OrganizationRecipientLinkRepository;
import com.project.backend.organization.repository.OrganizationRepository;
import com.project.backend.user.entity.User;
import com.project.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 보호자 탈퇴로 기관에 이관된 당사자의 재연결 승인 (ADR-014 항목 4).
 * 이관된 당사자는 주 보호자가 없어서, 코드만으로 연결하면 코드를 아는 누구든 기록에 접근한다.
 * 그래서 연결을 대기(PENDING)로 두고 연결된 기관이 승인해야 활성이 된다. 대기는 30일 뒤 만료한다.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class GuardianClaimService {
    static final int VALID_DAYS = 30;

    private final CareGuardianRepository guardians;
    private final CareRecipientRepository recipients;
    private final OrganizationRecipientLinkRepository links;
    private final OrganizationRepository organizations;
    private final UserRepository users;
    private final NotificationService notifications;

    public ClaimPendingResponse request(User claimant, CareRecipient recipient) {
        recipients.findForUpdate(recipient.getId());
        // 호출 쪽 검사는 잠금 전이라, 승인과 겹쳤다면 이미 활성 보호자가 생겼을 수 있다
        if (guardians.findByCareRecipientIdAndTypeAndStatus(recipient.getId(), GuardianType.PRIMARY, GuardianStatus.ACTIVE).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "ALREADY_CLAIMED", "이미 보호자가 등록된 당사자입니다.");
        }
        List<Organization> approvers = approvingOrganizations(recipient.getId());
        if (approvers.isEmpty()) {
            throw new ApiException(HttpStatus.CONFLICT, "APPROVAL_UNAVAILABLE",
                    "승인할 기관이 없어 연결할 수 없습니다. 운영자에게 문의해 주세요.");
        }
        LocalDateTime now = LocalDateTime.now();
        for (CareGuardian existing : pendingPrimaries(recipient.getId())) {
            if (isExpired(existing, now)) existing.revoke();
            else throw new ApiException(HttpStatus.CONFLICT, "CLAIM_ALREADY_PENDING", "이미 기관의 승인을 기다리는 연결 요청이 있습니다.");
        }
        CareGuardian claim = guardians.save(CareGuardian.builder().careRecipientId(recipient.getId())
                .guardianId(claimant.getId()).type(GuardianType.PRIMARY).status(GuardianStatus.PENDING).build());
        for (Organization org : approvers) {
            if (org.getOwnerId() != null) {
                notifications.notifyOrganizationLinkRequested(org.getOwnerId(),
                        "'" + recipient.getName() + "' 님의 보호자 연결 요청이 도착했습니다.");
            }
        }
        return ClaimPendingResponse.pending(expiresAt(claim));
    }

    @Transactional(readOnly = true)
    public List<GuardianClaimResponse> list(Long ownerId) {
        Organization org = organizationOf(ownerId);
        List<Long> recipientIds = links.findByOrganizationId(org.getId()).stream()
                .filter(l -> l.getStatus() == LinkStatus.ACCEPTED)
                .map(OrganizationRecipientLink::getCareRecipientId).toList();
        if (recipientIds.isEmpty()) return List.of();
        LocalDateTime now = LocalDateTime.now();
        List<CareGuardian> pending = guardians
                .findByCareRecipientIdInAndTypeAndStatus(recipientIds, GuardianType.PRIMARY, GuardianStatus.PENDING)
                .stream().filter(g -> !isExpired(g, now)).toList();
        Map<Long, CareRecipient> recipientMap = recipients.findAllById(recipientIds).stream()
                .collect(Collectors.toMap(CareRecipient::getId, Function.identity()));
        Map<Long, User> userMap = users.findAllById(pending.stream().map(CareGuardian::getGuardianId).toList()).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        return pending.stream().map(g -> {
            CareRecipient r = recipientMap.get(g.getCareRecipientId());
            User u = userMap.get(g.getGuardianId());
            return new GuardianClaimResponse(g.getId(), g.getCareRecipientId(),
                    r == null ? null : r.getName(), r == null ? null : r.getCareRecipientNumber(),
                    g.getGuardianId(), u == null ? null : u.getName(), u == null ? null : u.getPublicCode(),
                    g.getCreatedAt(), expiresAt(g));
        }).toList();
    }

    public void decide(Long ownerId, Long claimId, boolean accepted) {
        Organization org = organizationOf(ownerId);
        CareGuardian claim = guardians.findById(claimId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CLAIM_NOT_FOUND", "연결 요청을 찾을 수 없습니다."));
        if (claim.getType() != GuardianType.PRIMARY || claim.getStatus() != GuardianStatus.PENDING) {
            throw new ApiException(HttpStatus.CONFLICT, "CLAIM_ALREADY_DECIDED", "이미 처리된 요청입니다.");
        }
        if (!links.existsByOrganizationIdAndCareRecipientIdAndStatus(org.getId(), claim.getCareRecipientId(), LinkStatus.ACCEPTED)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "접근 권한이 없습니다.");
        }
        if (isExpired(claim, LocalDateTime.now())) {
            // 예외로 롤백되므로 여기서 상태를 바꾸지 않는다. 만료 요청은 목록에서 빠지고 다음 요청 때 정리된다
            throw new ApiException(HttpStatus.CONFLICT, "CLAIM_EXPIRED", "만료된 요청입니다. 보호자가 다시 요청해야 합니다.");
        }
        CareRecipient recipient = recipients.findForUpdate(claim.getCareRecipientId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CARE_RECIPIENT_NOT_FOUND", "당사자를 찾을 수 없습니다."));
        if (accepted) {
            if (guardians.findByCareRecipientIdAndTypeAndStatus(recipient.getId(), GuardianType.PRIMARY, GuardianStatus.ACTIVE).isPresent()) {
                throw new ApiException(HttpStatus.CONFLICT, "ALREADY_CLAIMED", "이미 보호자가 등록된 당사자입니다.");
            }
            claim.activate();
            recipient.clearTransferred();
        } else {
            claim.revoke();
        }
        notifications.notifyAssignmentChanged(claim.getGuardianId(), accepted
                ? "기관이 '" + recipient.getName() + "' 님의 보호자 연결을 승인했습니다."
                : "기관이 '" + recipient.getName() + "' 님의 보호자 연결 요청을 거절했습니다.");
    }

    private List<Organization> approvingOrganizations(Long recipientId) {
        List<Long> orgIds = links.findByCareRecipientIdInAndStatus(List.of(recipientId), LinkStatus.ACCEPTED).stream()
                .map(OrganizationRecipientLink::getOrganizationId).toList();
        return organizations.findAllById(orgIds);
    }

    private List<CareGuardian> pendingPrimaries(Long recipientId) {
        return guardians.findByCareRecipientIdAndStatus(recipientId, GuardianStatus.PENDING).stream()
                .filter(g -> g.getType() == GuardianType.PRIMARY).toList();
    }

    private Organization organizationOf(Long ownerId) {
        return organizations.findFirstByOwnerIdOrderByIdAsc(ownerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ORGANIZATION_NOT_FOUND", "기관을 찾을 수 없습니다."));
    }

    private boolean isExpired(CareGuardian claim, LocalDateTime now) {
        return expiresAt(claim).isBefore(now);
    }

    private LocalDateTime expiresAt(CareGuardian claim) {
        return claim.getCreatedAt().plusDays(VALID_DAYS);
    }
}
