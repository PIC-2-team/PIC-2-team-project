package com.project.backend.auth.dto;

import com.project.backend.user.entity.UserRole;
import jakarta.validation.constraints.*;

public record RegisterRequest(
        @NotBlank String consentTicket,
        @NotBlank @Size(max = 50) String name,
        @Email @NotBlank String email,
        @NotBlank @Size(min = 8) String password,
        @NotBlank(message = "전화번호를 입력해 주세요.")
        @Pattern(regexp = "^01[016789]-?\\d{3,4}-?\\d{4}$", message = "올바른 전화번호 형식을 입력해 주세요.")
        String phone,
        @NotNull UserRole role
) {}
