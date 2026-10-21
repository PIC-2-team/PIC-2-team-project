package com.project.backend.admin.dto;

import com.project.backend.organization.entity.Organization;

import java.time.LocalDateTime;

public record AdminOrganizationResponse(
        Long id,
        String name,
        String organizationCode,
        Long ownerId,
        String ownerName,
        LocalDateTime createdAt
) {
    public static AdminOrganizationResponse of(Organization org, String ownerName) {
        return new AdminOrganizationResponse(
                org.getId(),
                org.getName(),
                org.getOrganizationCode(),
                org.getOwnerId(),
                ownerName,
                org.getCreatedAt()
        );
    }
}
