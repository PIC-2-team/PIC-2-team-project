package com.project.backend.record.dto;

import com.project.backend.record.entity.RecordCategory;
import jakarta.validation.constraints.*;
import java.time.OffsetDateTime;
import java.util.List;

public record CreateRecordRequest(
        @NotBlank @Size(max = 500) String content,
        @NotNull RecordCategory category,
        @NotNull OffsetDateTime recordedAt,
        @Size(max = 5) List<Long> mediaIds,
        Boolean pinned) {
    public CreateRecordRequest {
        if (content != null) content = content.trim();
    }
}
