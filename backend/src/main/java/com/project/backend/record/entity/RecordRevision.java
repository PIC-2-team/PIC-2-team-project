package com.project.backend.record.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "record_revision", uniqueConstraints = @UniqueConstraint(columnNames = {"recordId", "revision"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RecordRevision {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long recordId;
    @Column(nullable = false)
    private Long changedById;
    @Column(nullable = false, length = 500)
    private String content;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30)
    private RecordCategory category;
    @Column(nullable = false)
    private Instant recordedAt;
    @Column(nullable = false)
    private int revision;
    @Column(nullable = false)
    private Instant changedAt;

    public RecordRevision(DailyRecord record, Long changedById, int revision, Instant now) {
        this.recordId = record.getId();
        this.changedById = changedById;
        this.content = record.getContent();
        this.category = record.getCategory();
        this.recordedAt = record.getRecordedAt();
        this.revision = revision;
        this.changedAt = now;
    }
}
