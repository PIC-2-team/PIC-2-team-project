package com.project.backend.admin.dto;

import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;

import java.time.LocalDateTime;

public record UserSummaryResponse(
        Long id,
        String name,
        String email,
        UserRole role,
        String publicCode,
        LocalDateTime createdAt
) {
    public static UserSummaryResponse from(User user) {
        return new UserSummaryResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.getPublicCode(),
                user.getCreatedAt()
        );
    }
}
