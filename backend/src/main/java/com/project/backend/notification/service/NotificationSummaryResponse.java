package com.project.backend.notification.service;

import java.time.Instant;

public record NotificationSummaryResponse(int unreadCount, String summary, Instant generatedAt) {
}
