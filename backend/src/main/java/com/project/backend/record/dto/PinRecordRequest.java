package com.project.backend.record.dto;
import jakarta.validation.constraints.NotNull;
public record PinRecordRequest(@NotNull Boolean pinned) { }
