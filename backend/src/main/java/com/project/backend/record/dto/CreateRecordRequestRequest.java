package com.project.backend.record.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateRecordRequestRequest(
        @NotBlank @Size(max = 100) String idempotencyKey,
        @Size(max = 500) String message
) {}
