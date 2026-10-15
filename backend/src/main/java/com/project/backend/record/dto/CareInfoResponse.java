package com.project.backend.record.dto;

import com.project.backend.record.entity.*;
import java.time.Instant;

public record CareInfoResponse(CareInfoCategory category, String content, Instant updatedAt) {
    public static CareInfoResponse of(CareInfo info) {
        return new CareInfoResponse(info.getCategory(), info.getContent(), info.getUpdatedAt());
    }
    public static CareInfoResponse empty(CareInfoCategory category) {
        return new CareInfoResponse(category, "", null);
    }
}
