package com.project.backend.care.dto;

import com.project.backend.care.entity.DisabilityType;
import com.project.backend.care.entity.Gender;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record CreateCareRecipientRequest(
        @NotBlank String name,
        @NotNull LocalDate birthDate,
        @NotNull Gender gender,
        @NotEmpty List<DisabilityType> disabilityTypes,
        Integer disabilityGrade,
        String otherDisabilityType
) {}
