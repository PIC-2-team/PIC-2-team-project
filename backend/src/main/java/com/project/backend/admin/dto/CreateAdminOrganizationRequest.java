package com.project.backend.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateAdminOrganizationRequest(
        @NotBlank(message = "기관 이름을 입력해 주세요.")
        @Size(max = 100, message = "기관 이름은 100자 이하이어야 합니다.")
        String name
) {}
