package com.project.backend.care.dto;

import java.time.LocalDateTime;

/** 이관된 당사자에 연결을 요청하면 즉시 연결되지 않고 기관 승인을 기다린다 */
public record ClaimPendingResponse(String status, LocalDateTime expiresAt) {
    public static ClaimPendingResponse pending(LocalDateTime expiresAt) {
        return new ClaimPendingResponse("PENDING", expiresAt);
    }
}
