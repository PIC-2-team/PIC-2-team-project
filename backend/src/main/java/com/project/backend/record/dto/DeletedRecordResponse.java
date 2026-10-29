package com.project.backend.record.dto;

import com.project.backend.record.entity.DailyRecord;
import com.project.backend.record.entity.RecordCategory;
import java.time.Instant;

public record DeletedRecordResponse(Long id, String content, RecordCategory category,
                                    Instant recordedAt, Instant deletedAt, Instant restoreUntil) {
    public static DeletedRecordResponse of(DailyRecord record, Instant restoreUntil) {
        return new DeletedRecordResponse(record.getId(), record.getContent(), record.getCategory(),
                record.getRecordedAt(), record.getDeletedAt(), restoreUntil);
    }
}
