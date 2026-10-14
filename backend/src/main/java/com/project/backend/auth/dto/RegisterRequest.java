package com.project.backend.auth.dto;

import com.project.backend.user.entity.UserRole;
import jakarta.validation.constraints.*;

public record RegisterRequest(
        @NotBlank String consentTicket,
        @NotBlank @Size(max = 50) String name,
        @Email @NotBlank String email,
        @NotBlank @Size(min = 8) String password,
        String phone,
        @NotNull UserRole role
) {}
