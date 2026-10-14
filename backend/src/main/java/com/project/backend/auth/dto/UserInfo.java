package com.project.backend.auth.dto;

import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;

public record UserInfo(Long id, String name, String email, String publicCode, UserRole role) {
    public static UserInfo from(User user) {
        return new UserInfo(user.getId(), user.getName(), user.getEmail(), user.getPublicCode(), user.getRole());
    }
}
