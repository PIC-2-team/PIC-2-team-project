package com.project.backend.organization.dto;

import com.project.backend.organization.entity.Organization;

import java.time.LocalDateTime;

public record OrganizationResponse(Long id, String name, String organizationCode, LocalDateTime createdAt) {
    public static OrganizationResponse from(Organization org) {
        return new OrganizationResponse(org.getId(), org.getName(), org.getOrganizationCode(), org.getCreatedAt());
    }
}
