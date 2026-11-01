package com.project.backend.schedule.dto;

import com.project.backend.schedule.entity.Schedule;
import java.time.Instant;

public record ScheduleResponse(
        Long id,
        Long careRecipientId,
        Long createdById,
        String title,
        String description,
        Instant scheduledAt,
        Instant createdAt,
        Instant updatedAt
) {
    public static ScheduleResponse of(Schedule s) {
        return new ScheduleResponse(s.getId(), s.getCareRecipientId(), s.getCreatedById(),
                s.getTitle(), s.getDescription(), s.getScheduledAt(), s.getCreatedAt(), s.getUpdatedAt());
    }
}
