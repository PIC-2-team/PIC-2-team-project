package com.project.backend.admin.dto;

import com.project.backend.care.entity.DisabilityType;
import com.project.backend.care.entity.Gender;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record CreateAdminCareRecipientRequest(
        @NotBlank(message = "이름은 필수입니다.")
        String name,

        @NotNull(message = "생년월일은 필수입니다.")
        LocalDate birthDate,

        @NotNull(message = "성별은 필수입니다.")
        Gender gender,

        List<DisabilityType> disabilityTypes,
        Integer disabilityGrade,
        String otherDisabilityType
) {
}
