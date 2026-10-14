package com.project.backend.record.dto;

import jakarta.validation.constraints.NotNull;

public record RecordSuggestionDecisionRequest(@NotNull Decision decision) {
    public enum Decision { APPROVE, REJECT }
}
