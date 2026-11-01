package com.project.backend.schedule.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;

public record UpdateScheduleRequest(
        // @NotBlank와 같은 공백 기준(Character.isWhitespace)을 쓰되 null은 허용해야 해서 정규식을 쓴다
        @Pattern(regexp = "(?s).*[^\\p{javaWhitespace}].*", message = "일정 제목은 비워둘 수 없습니다.") @Size(max = 200) String title,
        @Size(max = 500) String description,
        OffsetDateTime scheduledAt
) { }
