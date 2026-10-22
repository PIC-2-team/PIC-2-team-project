package com.project.backend.organization.dto;

public record AddMemberRequest(
        Long userId,
        String name,
        String phone
) {}
