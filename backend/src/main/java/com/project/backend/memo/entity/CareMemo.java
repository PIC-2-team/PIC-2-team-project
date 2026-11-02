package com.project.backend.memo.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "care_memo", indexes = @Index(columnList = "careRecipientId,date"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CareMemo {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long careRecipientId;

    @Column(nullable = false)
    private Long createdById;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false, length = 500)
    private String content;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @Builder
    public CareMemo(Long careRecipientId, Long createdById, LocalDate date, String content, Instant now) {
        this.careRecipientId = careRecipientId;
        this.createdById = createdById;
        this.date = date;
        this.content = content;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void update(String content, Instant now) {
        this.content = content;
        this.updatedAt = now;
    }
}
