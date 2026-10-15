package com.project.backend.organization.dto;

import com.project.backend.care.entity.CareAssignment;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record CareAssignmentResponse(
        Long id,
        Long organizationId,
        Long careRecipientId,
        Long supportWorkerId,
        LocalDate startDate,
        LocalDate endDate,
        LocalDateTime endedAt,
        LocalDateTime createdAt
) {
    public static CareAssignmentResponse from(CareAssignment a) {
        return new CareAssignmentResponse(
                a.getId(), a.getOrganizationId(), a.getCareRecipientId(),
                a.getSupportWorkerId(), a.getStartDate(), a.getEndDate(),
                a.getEndedAt(), a.getCreatedAt()
        );
    }
}
