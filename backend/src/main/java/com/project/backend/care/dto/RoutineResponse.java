package com.project.backend.care.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.project.backend.care.entity.CareRecipientRoutine;

import java.time.LocalTime;

public record RoutineResponse(
        Long id,
        Long careRecipientId,
        @JsonFormat(pattern = "HH:mm") LocalTime time,
        String title,
        String memo
) {
    public static RoutineResponse of(CareRecipientRoutine r) {
        return new RoutineResponse(r.getId(), r.getCareRecipientId(), r.getRoutineTime(), r.getTitle(), r.getMemo());
    }
}
