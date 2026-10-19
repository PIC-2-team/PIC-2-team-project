package com.project.backend.record.service;

import com.project.backend.care.entity.GuardianStatus;
import com.project.backend.care.repository.*;
import com.project.backend.common.exception.ApiException;
import com.project.backend.organization.entity.LinkStatus;
import com.project.backend.organization.repository.*;
import com.project.backend.user.entity.*;
import com.project.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecordAccessService {
    private final CareGuardianRepository guardians;
    private final CareAssignmentRepository assignments;
    private final OrganizationRepository organizations;
    private final OrganizationRecipientLinkRepository links;
    private final UserRepository users;
    private final Clock clock;

    public boolean isGuardian(Long userId, Long recipientId) {
        return guardians.existsByCareRecipientIdAndGuardianIdAndStatus(recipientId, userId, GuardianStatus.ACTIVE);
    }

    public void verifyRead(Long userId, Long recipientId) {
        User user = user(userId);
        boolean allowed = switch (user.getRole()) {
            case GUARDIAN -> isGuardian(userId, recipientId);
            case SUPPORT_WORKER -> isAssigned(userId, recipientId);
            case INSTITUTION -> organizations.findByOwnerId(userId)
                    .map(org -> links.existsByOrganizationIdAndCareRecipientIdAndStatus(
                            org.getId(), recipientId, LinkStatus.ACCEPTED)).orElse(false);
            case ADMIN -> true;
        };
        require(allowed);
    }

    public void verifyCreate(Long userId, Long recipientId) {
        User user = user(userId);
        require((user.getRole() == UserRole.GUARDIAN && isGuardian(userId, recipientId))
                || (user.getRole() == UserRole.SUPPORT_WORKER && isAssigned(userId, recipientId)));
    }

    public void verifyEdit(Long userId, Long recipientId, Long authorId) {
        verifyCreate(userId, recipientId);
        require(isGuardian(userId, recipientId) || userId.equals(authorId));
    }

    public void verifyGuardian(Long userId, Long recipientId) {
        require(user(userId).getRole() == UserRole.GUARDIAN && isGuardian(userId, recipientId));
    }

    public void verifySuggestionCreate(Long userId, Long recipientId) {
        User actor = user(userId);
        require(actor.getRole() == UserRole.SUPPORT_WORKER || actor.getRole() == UserRole.INSTITUTION);
        verifyRead(userId, recipientId);
    }

    private boolean isAssigned(Long userId, Long recipientId) {
        return assignments.hasCurrentAssignment(userId, recipientId, clock.instant().atZone(ZoneId.of("Asia/Seoul")).toLocalDate());
    }

    private User user(Long id) {
        return users.findById(id).orElseThrow(() -> new ApiException(
                HttpStatus.FORBIDDEN, "FORBIDDEN", "접근 권한이 없습니다."));
    }

    private void require(boolean allowed) {
        if (!allowed) throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "접근 권한이 없습니다.");
    }
}
