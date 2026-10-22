package com.project.backend.organization.dto;

public record UpdateMemberRequest(
        Boolean active,
        String name,
        String phone
) {}
