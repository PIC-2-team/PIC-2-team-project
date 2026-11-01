package com.project.backend.care.dto;

import com.project.backend.care.entity.DisabilityType;
import com.project.backend.care.entity.Gender;
import com.project.backend.care.entity.DisabilitySeverity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record CreateCareRecipientRequest(
        @NotBlank String name,
        @NotNull LocalDate birthDate,
        @NotNull Gender gender,
        @NotEmpty List<DisabilityType> disabilityTypes,
        Integer disabilityGrade,
        String otherDisabilityType,
        DisabilitySeverity disabilitySeverity,
        @Size(max = 20) String guardianPhone,
        @Size(max = 20) String emergencyContactPhone,
        @Size(max = 100) String doctorHospital,
        @Size(max = 1000) String medicationInfo,
        @Size(max = 1000) String allergyNotes
) {
    public CreateCareRecipientRequest(String name, LocalDate birthDate, Gender gender,
                                      List<DisabilityType> disabilityTypes, Integer disabilityGrade,
                                      String otherDisabilityType) {
        this(name, birthDate, gender, disabilityTypes, disabilityGrade, otherDisabilityType, null,
                null, null, null, null, null);
    }

    public CreateCareRecipientRequest(String name, LocalDate birthDate, Gender gender,
                                      List<DisabilityType> disabilityTypes, Integer disabilityGrade,
                                      String otherDisabilityType, DisabilitySeverity disabilitySeverity) {
        this(name, birthDate, gender, disabilityTypes, disabilityGrade, otherDisabilityType, disabilitySeverity,
                null, null, null, null, null);
    }
}
