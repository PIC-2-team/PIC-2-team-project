package com.project.backend.care.dto;

import com.project.backend.care.entity.DisabilitySeverity;
import com.project.backend.care.entity.DisabilityType;
import com.project.backend.care.entity.Gender;

import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record UpdateCareRecipientRequest(
        String name,
        LocalDate birthDate,
        Gender gender,
        List<DisabilityType> disabilityTypes,
        DisabilitySeverity disabilitySeverity,
        String otherDisabilityType,
        @Size(max = 100) String hospitalName,
        @Size(max = 50) String doctorName,
        @Size(max = 30) String hospitalPhone,
        @Size(max = 100) String supportCenterName,
        @Size(max = 50) String supportCenterManagerName,
        @Size(max = 30) String supportCenterPhone
) {}
