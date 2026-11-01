package com.project.backend.schedule.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;

public record UpdateScheduleRequest(
        @Pattern(regexp = "(?s).*\\S.*", message = "일정 제목은 비워둘 수 없습니다.") @Size(max = 200) String title,
        @Size(max = 500) String description,
        OffsetDateTime scheduledAt
) { }
