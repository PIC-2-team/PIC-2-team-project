package com.project.backend.care.dto;

import com.project.backend.care.entity.CareRecipient;
import com.project.backend.care.entity.DisabilitySeverity;
import com.project.backend.care.entity.DisabilityType;
import com.project.backend.care.entity.Gender;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record CareRecipientResponse(
        Long id,
        String careRecipientNumber,
        String name,
        LocalDate birthDate,
        Gender gender,
        List<DisabilityType> disabilityTypes,
        DisabilitySeverity disabilitySeverity,
        String otherDisabilityType,
        LocalDateTime latestRecordAt,
        LocalDateTime createdAt,
        String guardianName,
        String guardianPhone,
        String hospitalName,
        String doctorName,
        String hospitalPhone,
        String supportCenterName,
        String supportCenterManagerName,
        String supportCenterPhone
) {
    public CareRecipientResponse(
            Long id,
            String careRecipientNumber,
            String name,
            LocalDate birthDate,
            Gender gender,
            List<DisabilityType> disabilityTypes,
            DisabilitySeverity disabilitySeverity,
            String otherDisabilityType,
            LocalDateTime latestRecordAt,
            LocalDateTime createdAt
    ) {
        this(id, careRecipientNumber, name, birthDate, gender, disabilityTypes, disabilitySeverity,
                otherDisabilityType, latestRecordAt, createdAt, null, null,
                null, null, null, null, null, null);
    }

    public static CareRecipientResponse of(CareRecipient r, List<DisabilityType> disabilities) {
        return of(r, disabilities, null, null);
    }

    public static CareRecipientResponse of(
            CareRecipient r,
            List<DisabilityType> disabilities,
            String guardianName,
            String guardianPhone
    ) {
        return new CareRecipientResponse(
                r.getId(), r.getCareRecipientNumber(), r.getName(),
                r.getBirthDate(), r.getGender(), disabilities,
                r.getDisabilitySeverity(), r.getOtherDisabilityType(),
                r.getLatestRecordAt(), r.getCreatedAt(),
                guardianName, guardianPhone,
                r.getHospitalName(), r.getDoctorName(), r.getHospitalPhone(),
                r.getSupportCenterName(), r.getSupportCenterManagerName(), r.getSupportCenterPhone()
        );
    }
}
