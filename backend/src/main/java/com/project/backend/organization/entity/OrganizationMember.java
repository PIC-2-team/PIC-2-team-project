package com.project.backend.organization.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "organization_member",
       uniqueConstraints = @UniqueConstraint(columnNames = {"organizationId", "userId"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OrganizationMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long organizationId;

    @Column(nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private OrganizationMemberStatus status;

    @Column(nullable = false, updatable = false)
    private LocalDateTime joinedAt;

    @Builder
    public OrganizationMember(Long organizationId, Long userId) {
        this.organizationId = organizationId;
        this.userId = userId;
        this.status = OrganizationMemberStatus.ACTIVE;
        this.joinedAt = LocalDateTime.now();
    }

    public void deactivate() {
        this.status = OrganizationMemberStatus.INACTIVE;
    }
}
