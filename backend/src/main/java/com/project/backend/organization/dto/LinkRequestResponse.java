package com.project.backend.organization.dto;

import com.project.backend.care.entity.CareRecipient;
import com.project.backend.organization.entity.LinkStatus;
import com.project.backend.organization.entity.OrganizationRecipientLink;
import com.project.backend.user.entity.User;

import java.time.LocalDateTime;

/** 이름·코드는 요청이 누구의 것인지 기관이 알아볼 수 있도록 함께 내려 준다 (연결 전 당사자는 기관 목록에 없다) */
public record LinkRequestResponse(
        Long id,
        Long organizationId,
        Long careRecipientId,
        String careRecipientName,
        String careRecipientNumber,
        Long requestedById,
        String requestedByName,
        String requestedByPublicCode,
        LinkStatus status,
        LocalDateTime requestedAt,
        LocalDateTime decidedAt
) {
    public static LinkRequestResponse of(OrganizationRecipientLink link, CareRecipient recipient, User requester) {
        return new LinkRequestResponse(
                link.getId(), link.getOrganizationId(), link.getCareRecipientId(),
                recipient == null ? null : recipient.getName(),
                recipient == null ? null : recipient.getCareRecipientNumber(),
                link.getRequestedById(),
                requester == null ? null : requester.getName(),
                requester == null ? null : requester.getPublicCode(),
                link.getStatus(), link.getRequestedAt(), link.getDecidedAt()
        );
    }
}
