package com.project.backend.schedule.dto;

import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;

public record UpdateScheduleRequest(
        @Size(max = 200) String title,
        @Size(max = 500) String description,
        OffsetDateTime scheduledAt
) { }
