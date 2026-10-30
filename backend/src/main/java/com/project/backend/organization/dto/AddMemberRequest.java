package com.project.backend.organization.dto;

import jakarta.validation.constraints.NotBlank;

public record AddMemberRequest(
        @NotBlank(message = "지원사 고유 코드를 입력해 주세요.")
        String publicCode
) {}
