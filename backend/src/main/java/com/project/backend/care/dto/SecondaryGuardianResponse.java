package com.project.backend.care.dto;

import com.project.backend.care.entity.CareGuardian;
import com.project.backend.care.entity.GuardianStatus;

import java.time.LocalDateTime;

public record SecondaryGuardianResponse(
        Long id,
        Long careRecipientId,
        Long guardianId,
        GuardianStatus status,
        String invitationToken,
        LocalDateTime invitationExpiresAt,
        LocalDateTime createdAt
) {
    public static SecondaryGuardianResponse from(CareGuardian g) {
        return new SecondaryGuardianResponse(
                g.getId(), g.getCareRecipientId(), g.getGuardianId(),
                g.getStatus(), g.getInvitationToken(), g.getInvitationExpiresAt(),
                g.getCreatedAt()
        );
    }
}
