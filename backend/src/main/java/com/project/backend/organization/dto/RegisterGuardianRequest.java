package com.project.backend.organization.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;

public record RegisterGuardianRequest(
        @NotBlank(message = "보호자 전화번호를 입력해 주세요.")
        @JsonAlias({"guardianPhone", "phone", "guardianCodeOrEmail"})
        String phone
) {
    public String getIdentifier() {
        return phone != null ? phone.trim() : "";
    }
}
