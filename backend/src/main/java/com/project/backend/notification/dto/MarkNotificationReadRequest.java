package com.project.backend.notification.dto;

import jakarta.validation.constraints.NotNull;

public record MarkNotificationReadRequest(@NotNull Boolean read) {
}
