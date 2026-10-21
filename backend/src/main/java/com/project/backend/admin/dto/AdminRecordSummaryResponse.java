package com.project.backend.admin.dto;

import com.project.backend.record.entity.DailyRecord;
import com.project.backend.record.entity.RecordCategory;

import java.time.Instant;

public record AdminRecordSummaryResponse(
        Long id,
        Long careRecipientId,
        String careRecipientName,
        Long authorId,
        String authorName,
        String content,
        RecordCategory category,
        Instant recordedAt,
        Instant createdAt
) {
    public static AdminRecordSummaryResponse of(
            DailyRecord record,
            String careRecipientName,
            String authorName
    ) {
        return new AdminRecordSummaryResponse(
                record.getId(),
                record.getCareRecipientId(),
                careRecipientName,
                record.getAuthorId(),
                authorName,
                record.getContent(),
                record.getCategory(),
                record.getRecordedAt(),
                record.getCreatedAt()
        );
    }
}
