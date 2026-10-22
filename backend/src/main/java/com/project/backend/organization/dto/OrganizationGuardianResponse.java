package com.project.backend.organization.dto;

import java.time.LocalDateTime;
import java.util.List;

public record OrganizationGuardianResponse(
        Long id,
        Long guardianId,
        String name,
        String phone,
        String email,
        String publicCode,
        LocalDateTime createdAt,
        List<CareRecipientSummary> careRecipients
) {
    public record CareRecipientSummary(
            Long id,
            String name,
            String careRecipientNumber,
            String birthDate
    ) {}
}
