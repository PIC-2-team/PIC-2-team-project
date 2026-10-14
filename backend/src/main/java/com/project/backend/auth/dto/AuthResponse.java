package com.project.backend.auth.dto;

public record AuthResponse(String accessToken, UserInfo user) {}
