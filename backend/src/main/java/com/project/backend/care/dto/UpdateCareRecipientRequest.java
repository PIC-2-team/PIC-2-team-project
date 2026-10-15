package com.project.backend.care.dto;

import com.project.backend.care.entity.DisabilityType;
import com.project.backend.care.entity.Gender;

import java.time.LocalDate;
import java.util.List;

public record UpdateCareRecipientRequest(
        String name,
        LocalDate birthDate,
        Gender gender,
        List<DisabilityType> disabilityTypes,
        Integer disabilityGrade,
        String otherDisabilityType
) {}
