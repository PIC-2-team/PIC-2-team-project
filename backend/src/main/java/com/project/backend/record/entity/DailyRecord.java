package com.project.backend.record.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "daily_record", indexes = @Index(columnList = "careRecipientId,recordedAt"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DailyRecord {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long careRecipientId;
    @Column(nullable = false)
    private Long authorId;
    @Column(nullable = false, length = 500)
    private String content;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30)
    private RecordCategory category;
    @Column(nullable = false)
    private Instant recordedAt;
    @Column(nullable = false)
    private boolean pinned;
    @Column(nullable = false, updatable = false)
    private Instant createdAt;
    @Column(nullable = false)
    private Instant updatedAt;
    private Instant deletedAt;

    @Builder
    public DailyRecord(Long careRecipientId, Long authorId, String content, RecordCategory category,
                       Instant recordedAt, boolean pinned, Instant now) {
        this.careRecipientId = careRecipientId;
        this.authorId = authorId;
        this.content = content;
        this.category = category;
        this.recordedAt = recordedAt;
        this.pinned = pinned;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void update(String content, RecordCategory category, Instant recordedAt, Instant now) {
        if (content != null) this.content = content;
        if (category != null) this.category = category;
        if (recordedAt != null) this.recordedAt = recordedAt;
        this.updatedAt = now;
    }

    public void delete(Instant now) { this.deletedAt = now; this.updatedAt = now; }
    public void restore(Instant now) { this.deletedAt = null; this.updatedAt = now; }
    public void pin(boolean pinned, Instant now) { this.pinned = pinned; this.updatedAt = now; }
}
