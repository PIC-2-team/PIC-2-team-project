package com.project.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record ConsentRequest(
        boolean basicInfo,
        boolean sensitiveInfo,
        boolean caregiverShare,
        boolean marketing,
        @NotBlank String termsVersion
) {}
