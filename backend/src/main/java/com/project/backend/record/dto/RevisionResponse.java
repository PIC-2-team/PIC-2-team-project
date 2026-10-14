package com.project.backend.record.dto;

import com.project.backend.record.entity.*;
import com.project.backend.user.entity.*;
import java.time.Instant;

public record RevisionResponse(int revision, ChangedBy changedBy, Instant changedAt,
                               String content, RecordCategory category, Instant recordedAt) {
    public record ChangedBy(Long id, String name, UserRole role) { }
    public static RevisionResponse of(RecordRevision revision, User user) {
        return new RevisionResponse(revision.getRevision(), new ChangedBy(user.getId(), user.getName(), user.getRole()),
                revision.getChangedAt(), revision.getContent(), revision.getCategory(), revision.getRecordedAt());
    }
}
