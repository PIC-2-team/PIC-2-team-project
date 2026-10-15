package com.project.backend.care.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "care_guardian")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CareGuardian {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long careRecipientId;

    @Column(nullable = false)
    private Long guardianId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private GuardianType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private GuardianStatus status;

    @Column(length = 100)
    private String invitationToken;

    @Column
    private LocalDateTime invitationExpiresAt;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public CareGuardian(Long careRecipientId, Long guardianId, GuardianType type,
                        GuardianStatus status, String invitationToken,
                        LocalDateTime invitationExpiresAt) {
        this.careRecipientId = careRecipientId;
        this.guardianId = guardianId;
        this.type = type;
        this.status = status;
        this.invitationToken = invitationToken;
        this.invitationExpiresAt = invitationExpiresAt;
        this.createdAt = LocalDateTime.now();
    }

    public void activate() {
        this.status = GuardianStatus.ACTIVE;
        this.invitationToken = null;
        this.invitationExpiresAt = null;
    }

    public void revoke() {
        this.status = GuardianStatus.REVOKED;
    }
}
