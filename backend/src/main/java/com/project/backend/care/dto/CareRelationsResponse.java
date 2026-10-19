package com.project.backend.care.dto;

import com.project.backend.organization.entity.LinkStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record CareRelationsResponse(
        Long careRecipientId,
        List<OrganizationLinkInfo> organizations,
        List<AssignedWorkerInfo> assignments
) {
    public record OrganizationLinkInfo(
            Long linkId,
            Long organizationId,
            String organizationName,
            String organizationCode,
            LinkStatus status,
            LocalDateTime requestedAt
    ) {}

    public record AssignedWorkerInfo(
            Long assignmentId,
            Long supportWorkerId,
            String supportWorkerName,
            Long organizationId,
            String organizationName,
            LocalDate startDate,
            LocalDate endDate,
            LocalDateTime endedAt
    ) {}
}
