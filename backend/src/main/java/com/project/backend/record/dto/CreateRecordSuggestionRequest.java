package com.project.backend.record.dto;

import com.project.backend.record.entity.RecordCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateRecordSuggestionRequest(@NotBlank @Size(max = 500) String content,
                                           RecordCategory category,
                                           @Size(max = 1000) String reason) {
    public CreateRecordSuggestionRequest {
        if (content != null) content = content.trim();
        if (reason != null) reason = reason.trim();
    }
}
