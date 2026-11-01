package com.project.backend.organization.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "organization_guardian_link",
       uniqueConstraints = @UniqueConstraint(name = "uk_organization_guardian_link_org_guardian",
               columnNames = {"organizationId", "guardianId"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OrganizationGuardianLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long organizationId;

    @Column(nullable = false)
    private Long guardianId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public OrganizationGuardianLink(Long organizationId, Long guardianId) {
        this.organizationId = organizationId;
        this.guardianId = guardianId;
        this.createdAt = LocalDateTime.now();
    }
}
