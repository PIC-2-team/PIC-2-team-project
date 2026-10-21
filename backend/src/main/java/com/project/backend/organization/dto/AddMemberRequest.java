package com.project.backend.organization.dto;

import jakarta.validation.constraints.NotNull;

public record AddMemberRequest(
        @NotNull(message = "사용자 ID는 필수입니다.")
        Long userId
) {}
