package com.project.backend.auth.dto;

import com.project.backend.user.entity.UserRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record GoogleRegisterRequest(
        @NotBlank String idToken,
        @NotBlank String consentTicket,
        @NotNull UserRole role
) {}
