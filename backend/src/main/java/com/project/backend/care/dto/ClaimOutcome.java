package com.project.backend.care.dto;

/** 즉시 연결되면 recipient, 승인 대기이면 pending이 채워진다 */
public record ClaimOutcome(CareRecipientResponse recipient, ClaimPendingResponse pending) {
    public static ClaimOutcome connected(CareRecipientResponse recipient) {
        return new ClaimOutcome(recipient, null);
    }

    public static ClaimOutcome waiting(ClaimPendingResponse pending) {
        return new ClaimOutcome(null, pending);
    }
}
