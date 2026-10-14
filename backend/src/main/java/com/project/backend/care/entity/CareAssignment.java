package com.project.backend.care.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "care_assignment")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CareAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long organizationId;

    @Column(nullable = false)
    private Long careRecipientId;

    @Column(nullable = false)
    private Long supportWorkerId;

    @Column(nullable = false, unique = true, length = 100)
    private String idempotencyKey;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column
    private LocalDate endDate;

    @Column
    private LocalDateTime endedAt;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public CareAssignment(Long organizationId, Long careRecipientId, Long supportWorkerId,
                          String idempotencyKey, LocalDate startDate, LocalDate endDate) {
        this.organizationId = organizationId;
        this.careRecipientId = careRecipientId;
        this.supportWorkerId = supportWorkerId;
        this.idempotencyKey = idempotencyKey;
        this.startDate = startDate;
        this.endDate = endDate;
        this.createdAt = LocalDateTime.now();
    }

    public boolean isActive() {
        return endedAt == null;
    }

    public void end() {
        this.endedAt = LocalDateTime.now();
    }
}
