package com.project.backend.auth.dto;

/** 세션 발급 결과: HTTP 응답 데이터 + 쿠키로 내려줄 raw refresh token */
public record SessionResult<T>(T data, String rawRefreshToken) {}
