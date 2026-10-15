package com.project.backend.record.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Entity
@Table(name = "record_suggestion", indexes = @Index(columnList = "careRecipientId,status,createdAt"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RecordSuggestion {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long careRecipientId;
    @Column(nullable = false)
    private Long recordId;
    @Column(nullable = false)
    private Long suggestedById;
    @Column(nullable = false, length = 500)
    private String originalContent;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30)
    private RecordCategory originalCategory;
    @Column(nullable = false)
    private Instant originalUpdatedAt;
    @Column(nullable = false, length = 500)
    private String proposedContent;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30)
    private RecordCategory proposedCategory;
    @Column(length = 1000)
    private String reason;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private RecordSuggestionStatus status;
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public RecordSuggestion(DailyRecord record, Long suggestedById, String content,
                            RecordCategory category, String reason, Instant now) {
        this.careRecipientId = record.getCareRecipientId();
        this.recordId = record.getId();
        this.suggestedById = suggestedById;
        this.originalContent = record.getContent();
        this.originalCategory = record.getCategory();
        this.originalUpdatedAt = record.getUpdatedAt();
        this.proposedContent = content;
        this.proposedCategory = category == null ? record.getCategory() : category;
        this.reason = reason == null || reason.isBlank() ? null : reason.trim();
        this.status = RecordSuggestionStatus.PENDING;
        this.createdAt = now;
    }

    public void decide(RecordSuggestionStatus decision) {
        this.status = decision;
    }
}
