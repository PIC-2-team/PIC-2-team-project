package com.project.backend.care.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "access_log",
        indexes = @Index(columnList = "care_recipient_id, occurred_at DESC"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AccessLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long actorId;

    @Column(name = "care_recipient_id", nullable = false)
    private Long careRecipientId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AccessLogAction action;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AccessLogResourceType resourceType;

    @Column(nullable = false)
    private Long resourceId;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;

    @Builder
    public AccessLog(Long actorId, Long careRecipientId, AccessLogAction action,
                     AccessLogResourceType resourceType, Long resourceId) {
        this.actorId = actorId;
        this.careRecipientId = careRecipientId;
        this.action = action;
        this.resourceType = resourceType;
        this.resourceId = resourceId;
        this.occurredAt = LocalDateTime.now();
    }
}
