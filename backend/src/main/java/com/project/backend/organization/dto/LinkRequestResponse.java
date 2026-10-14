package com.project.backend.organization.dto;

import com.project.backend.organization.entity.LinkStatus;
import com.project.backend.organization.entity.OrganizationRecipientLink;

import java.time.LocalDateTime;

public record LinkRequestResponse(
        Long id,
        Long organizationId,
        Long careRecipientId,
        Long requestedById,
        LinkStatus status,
        LocalDateTime requestedAt,
        LocalDateTime decidedAt
) {
    public static LinkRequestResponse from(OrganizationRecipientLink link) {
        return new LinkRequestResponse(
                link.getId(), link.getOrganizationId(), link.getCareRecipientId(),
                link.getRequestedById(), link.getStatus(),
                link.getRequestedAt(), link.getDecidedAt()
        );
    }
}
