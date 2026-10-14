package com.project.backend.information.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Entity
@Table(name = "information_request", indexes = {
        @Index(name = "idx_information_request_requester", columnList = "requested_by_id, status, created_at"),
        @Index(name = "idx_information_request_organization", columnList = "organization_id, status, created_at"),
        @Index(name = "idx_information_request_recipient", columnList = "care_recipient_id, status, created_at")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InformationRequest {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "care_recipient_id", nullable = false)
    private Long careRecipientId;
    @Column(name = "requested_by_id", nullable = false)
    private Long requestedById;
    @Column(name = "organization_id", nullable = false)
    private Long organizationId;
    @Column(nullable = false, length = 1000)
    private String message;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private InformationRequestStatus status;
    @Column(name = "replied_by_id")
    private Long repliedById;
    @Column(name = "reply_message", length = 1000)
    private String replyMessage;
    @Column(name = "replied_at")
    private Instant repliedAt;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public InformationRequest(Long careRecipientId, Long requestedById, Long organizationId, String message, Instant now) {
        this.careRecipientId = careRecipientId;
        this.requestedById = requestedById;
        this.organizationId = organizationId;
        this.message = message;
        this.status = InformationRequestStatus.SUBMITTED;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void forward(Instant now) { status = InformationRequestStatus.FORWARDED; updatedAt = now; }
    public void reply(Long userId, String message, Instant now) {
        repliedById = userId; replyMessage = message; repliedAt = now;
        status = InformationRequestStatus.ANSWERED; updatedAt = now;
    }
    public void close(Instant now) { status = InformationRequestStatus.CLOSED; updatedAt = now; }
}
