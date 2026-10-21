package com.project.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank String name,
        @NotBlank String phone,
        @Email @NotBlank String email,
        @NotBlank @Size(min = 8) String newPassword
) {}
