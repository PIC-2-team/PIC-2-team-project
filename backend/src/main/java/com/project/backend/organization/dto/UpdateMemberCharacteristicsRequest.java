package com.project.backend.organization.dto;

import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotNull;

public record UpdateMemberCharacteristicsRequest(
        @NotNull(message = "특성을 입력해 주세요. 비우려면 빈 문자열을 보내 주세요.")
        @Size(max = 2000, message = "특성은 2000자 이내로 작성해 주세요.")
        String characteristics
) {}
