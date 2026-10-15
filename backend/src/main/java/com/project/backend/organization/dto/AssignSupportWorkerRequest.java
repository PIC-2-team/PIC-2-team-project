package com.project.backend.organization.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record AssignSupportWorkerRequest(
        @NotNull Long careRecipientId,
        @NotNull Long supportWorkerId,
        @NotNull LocalDate startDate,
        LocalDate endDate,
        @NotBlank String idempotencyKey
) {}
