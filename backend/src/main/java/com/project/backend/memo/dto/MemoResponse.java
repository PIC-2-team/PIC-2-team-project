package com.project.backend.memo.dto;

import com.project.backend.memo.entity.CareMemo;
import java.time.Instant;
import java.time.LocalDate;

public record MemoResponse(
        Long id,
        Long careRecipientId,
        Long createdById,
        LocalDate date,
        String content,
        Instant createdAt,
        Instant updatedAt
) {
    public static MemoResponse of(CareMemo m) {
        return new MemoResponse(m.getId(), m.getCareRecipientId(), m.getCreatedById(),
                m.getDate(), m.getContent(), m.getCreatedAt(), m.getUpdatedAt());
    }
}
