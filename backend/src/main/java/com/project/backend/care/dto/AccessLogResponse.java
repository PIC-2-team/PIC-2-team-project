package com.project.backend.care.dto;

import com.project.backend.care.entity.AccessLog;
import com.project.backend.care.entity.AccessLogAction;
import com.project.backend.care.entity.AccessLogResourceType;

import java.time.LocalDateTime;

public record AccessLogResponse(
        Long id,
        Long actorId,
        Long careRecipientId,
        AccessLogAction action,
        AccessLogResourceType resourceType,
        Long resourceId,
        LocalDateTime occurredAt
) {
    public static AccessLogResponse from(AccessLog log) {
        return new AccessLogResponse(log.getId(), log.getActorId(), log.getCareRecipientId(),
                log.getAction(), log.getResourceType(), log.getResourceId(), log.getOccurredAt());
    }
}
