package com.project.backend.organization.dto;

import jakarta.validation.constraints.NotBlank;

public record RegisterGuardianRequest(
        @NotBlank(message = "보호자 고유 코드를 입력해 주세요.")
        String publicCode
) {}
