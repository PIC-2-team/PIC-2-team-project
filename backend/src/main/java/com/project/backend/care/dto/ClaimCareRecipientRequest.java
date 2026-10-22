package com.project.backend.care.dto;

import jakarta.validation.constraints.NotBlank;

public record ClaimCareRecipientRequest(
        @NotBlank(message = "당사자 고유 코드는 필수입니다.")
        String careRecipientNumber
) {
}
