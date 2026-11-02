package com.project.backend.organization.dto;

import jakarta.validation.constraints.Size;

public record UpdateMemberCharacteristicsRequest(
        @Size(max = 2000, message = "특성은 2000자 이내로 작성해 주세요.")
        String characteristics
) {}
