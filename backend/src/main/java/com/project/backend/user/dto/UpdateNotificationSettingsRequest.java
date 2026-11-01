package com.project.backend.user.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateNotificationSettingsRequest(@NotNull Boolean recordCreated,
                                                @NotNull Boolean recordUpdated,
                                                @NotNull Boolean assignmentChanged,
                                                @NotNull Boolean informationRequestReceived) {
}
