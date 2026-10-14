package com.project.backend.record.dto;

import com.project.backend.record.entity.*;
import com.project.backend.user.entity.*;
import com.project.backend.record.media.RecordMedia;
import java.time.Instant;
import java.util.List;

public record RecordResponse(Long id, Long careRecipientId, Author author, String content,
                             RecordCategory category, Instant recordedAt, Instant createdAt,
                             Instant updatedAt, boolean pinned, List<Media> media) {
    public record Author(Long id, String name, UserRole role, String publicCode) { }
    public record Media(Long mediaId, String fileName, String mediaType, long sizeBytes) { }

    public static RecordResponse of(DailyRecord record, User author) {
        return of(record, author, List.of());
    }

    public static RecordResponse of(DailyRecord record, User author, List<RecordMedia> media) {
        return new RecordResponse(record.getId(), record.getCareRecipientId(),
                new Author(author.getId(), author.getName(), author.getRole(), author.getPublicCode()),
                record.getContent(), record.getCategory(), record.getRecordedAt(), record.getCreatedAt(),
                record.getUpdatedAt(), record.isPinned(), media.stream()
                .map(item -> new Media(item.getId(), item.getFileName(), item.getMediaType(), item.getSizeBytes())).toList());
    }
}
