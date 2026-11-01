package com.project.backend.schedule.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "schedule", indexes = @Index(columnList = "careRecipientId,scheduledAt"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Schedule {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long careRecipientId;

    @Column(nullable = false)
    private Long createdById;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 500)
    private String description;

    @Column(nullable = false)
    private Instant scheduledAt;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @Builder
    public Schedule(Long careRecipientId, Long createdById, String title, String description,
                    Instant scheduledAt, Instant now) {
        this.careRecipientId = careRecipientId;
        this.createdById = createdById;
        this.title = title;
        this.description = description;
        this.scheduledAt = scheduledAt;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void update(String title, String description, Instant scheduledAt, Instant now) {
        if (title != null) this.title = title;
        if (description != null) this.description = description;
        if (scheduledAt != null) this.scheduledAt = scheduledAt;
        this.updatedAt = now;
    }
}
