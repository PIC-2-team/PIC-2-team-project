package com.project.backend.record.dto;

import com.project.backend.record.entity.RecordRequest;
import com.project.backend.record.entity.RecordRequestStatus;

import java.time.LocalDateTime;

public record RecordRequestResponse(
        Long id,
        Long organizationId,
        Long careRecipientId,
        Long supportWorkerId,
        String idempotencyKey,
        String message,
        Long completedRecordId,
        RecordRequestStatus status,
        LocalDateTime createdAt
) {
    public static RecordRequestResponse from(RecordRequest r) {
        return new RecordRequestResponse(
                r.getId(), r.getOrganizationId(), r.getCareRecipientId(),
                r.getSupportWorkerId(), r.getIdempotencyKey(), r.getMessage(),
                r.getCompletedRecordId(), r.getStatus(), r.getCreatedAt());
    }
}
