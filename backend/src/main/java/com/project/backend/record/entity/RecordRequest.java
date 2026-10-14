package com.project.backend.record.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "record_request",
        uniqueConstraints = @UniqueConstraint(columnNames = "idempotency_key"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RecordRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long organizationId;

    @Column(nullable = false)
    private Long careRecipientId;

    @Column(nullable = false)
    private Long supportWorkerId;

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 100)
    private String idempotencyKey;

    @Column(length = 500)
    private String message;

    @Column
    private Long completedRecordId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RecordRequestStatus status;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public RecordRequest(Long organizationId, Long careRecipientId, Long supportWorkerId,
                         String idempotencyKey, String message) {
        this.organizationId = organizationId;
        this.careRecipientId = careRecipientId;
        this.supportWorkerId = supportWorkerId;
        this.idempotencyKey = idempotencyKey;
        this.message = message;
        this.status = RecordRequestStatus.PENDING;
        this.createdAt = LocalDateTime.now();
    }

    public void cancel() {
        this.status = RecordRequestStatus.CANCELLED;
    }
}
