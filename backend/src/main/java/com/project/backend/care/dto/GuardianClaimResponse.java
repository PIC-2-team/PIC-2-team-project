package com.project.backend.care.dto;

import java.time.LocalDateTime;

/** 기관이 승인할 이관 당사자 재연결 요청 */
public record GuardianClaimResponse(
        Long id,
        Long careRecipientId,
        String careRecipientName,
        String careRecipientNumber,
        Long guardianId,
        String guardianName,
        String guardianPublicCode,
        LocalDateTime requestedAt,
        LocalDateTime expiresAt
) { }
