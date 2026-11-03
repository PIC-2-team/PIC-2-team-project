package com.project.backend.admin.dto;

import com.project.backend.care.entity.CareRecipient;
import com.project.backend.care.entity.DisabilitySeverity;
import com.project.backend.care.entity.DisabilityType;
import com.project.backend.care.entity.Gender;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record AdminCareRecipientResponse(
        Long id,
        String careRecipientNumber,
        String name,
        LocalDate birthDate,
        Gender gender,
        List<DisabilityType> disabilityTypes,
        DisabilitySeverity disabilitySeverity,
        String otherDisabilityType,
        String guardianName,
        String guardianEmail,
        String organizationName,
        LocalDateTime createdAt
) {
    public static AdminCareRecipientResponse of(
            CareRecipient recipient,
            List<DisabilityType> disabilities,
            String guardianName,
            String guardianEmail,
            String organizationName
    ) {
        return new AdminCareRecipientResponse(
                recipient.getId(),
                recipient.getCareRecipientNumber(),
                recipient.getName(),
                recipient.getBirthDate(),
                recipient.getGender(),
                disabilities,
                recipient.getDisabilitySeverity(),
                recipient.getOtherDisabilityType(),
                guardianName,
                guardianEmail,
                organizationName,
                recipient.getCreatedAt()
        );
    }
}
