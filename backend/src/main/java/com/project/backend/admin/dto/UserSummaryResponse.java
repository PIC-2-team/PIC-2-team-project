package com.project.backend.admin.dto;

import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;

import java.time.LocalDateTime;

public record UserSummaryResponse(
        Long id,
        String name,
        String email,
        String phone,
        UserRole role,
        String publicCode,
        Long organizationId,
        String organizationName,
        LocalDateTime createdAt
) {
    public static UserSummaryResponse from(User user) {
        return from(user, null, null);
    }

    public static UserSummaryResponse from(User user, Long organizationId, String organizationName) {
        return new UserSummaryResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole(),
                user.getPublicCode(),
                organizationId,
                organizationName,
                user.getCreatedAt()
        );
    }
}
