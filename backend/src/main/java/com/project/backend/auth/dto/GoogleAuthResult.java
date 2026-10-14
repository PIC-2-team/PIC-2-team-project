package com.project.backend.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record GoogleAuthResult(
        boolean requiresConsent,
        String accessToken,
        UserInfo user,
        String googleEmail,
        String googleName
) {
    public static GoogleAuthResult success(String accessToken, UserInfo user) {
        return new GoogleAuthResult(false, accessToken, user, null, null);
    }

    public static GoogleAuthResult requiresConsent(String googleEmail, String googleName) {
        return new GoogleAuthResult(true, null, null, googleEmail, googleName);
    }
}
