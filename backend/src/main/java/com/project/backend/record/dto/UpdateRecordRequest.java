package com.project.backend.record.dto;

import com.project.backend.record.entity.RecordCategory;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;

public record UpdateRecordRequest(@Size(min = 1, max = 500) String content,
                                  RecordCategory category, OffsetDateTime recordedAt,
                                  @Size(max = 5) List<Long> mediaIds) {
    public UpdateRecordRequest {
        if (content != null) content = content.trim();
    }
}
