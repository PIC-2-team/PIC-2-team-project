package com.project.backend.organization.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record RegisterOrganizationRequest(
        @NotBlank(message = "기관 코드를 입력해 주세요.")
        @Pattern(regexp = "^[A-Za-z0-9]{6}$", message = "기관 코드는 6자리 영숫자여야 합니다.")
        String organizationCode
) {}
