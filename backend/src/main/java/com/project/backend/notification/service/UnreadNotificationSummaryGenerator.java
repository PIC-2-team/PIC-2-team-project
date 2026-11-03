package com.project.backend.notification.service;

import com.project.backend.notification.entity.Notification;

import java.util.List;

public interface UnreadNotificationSummaryGenerator {
    String generate(List<Notification> notifications);
}
