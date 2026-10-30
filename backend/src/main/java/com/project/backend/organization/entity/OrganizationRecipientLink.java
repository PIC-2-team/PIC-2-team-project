package com.project.backend.organization.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "organization_recipient_link",
       uniqueConstraints = @UniqueConstraint(name = "uk_organization_recipient_link_org_recipient",
               columnNames = {"organizationId", "careRecipientId"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OrganizationRecipientLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long organizationId;

    @Column(nullable = false)
    private Long careRecipientId;

    @Column(nullable = false)
    private Long requestedById;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private LinkStatus status;

    @Column(nullable = false, updatable = false)
    private LocalDateTime requestedAt;

    @Column
    private LocalDateTime decidedAt;

    @Builder
    public OrganizationRecipientLink(Long organizationId, Long careRecipientId, Long requestedById) {
        this.organizationId = organizationId;
        this.careRecipientId = careRecipientId;
        this.requestedById = requestedById;
        this.status = LinkStatus.PENDING;
        this.requestedAt = LocalDateTime.now();
    }

    public void accept() {
        this.status = LinkStatus.ACCEPTED;
        this.decidedAt = LocalDateTime.now();
    }

    public void reject() {
        this.status = LinkStatus.REJECTED;
        this.decidedAt = LocalDateTime.now();
    }
}
