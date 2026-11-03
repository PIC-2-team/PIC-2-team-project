package com.project.backend.schedule.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;

public record CreateScheduleRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 500) String description,
        @NotNull OffsetDateTime scheduledAt
) { }
