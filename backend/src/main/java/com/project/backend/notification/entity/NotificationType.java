package com.project.backend.notification.entity;

public enum NotificationType {
    RECORD_CREATED("새 기록"),
    ASSIGNMENT_CHANGED("배정"),
    RECORD_FORWARDED("기록 전달"),
    ORGANIZATION_LINK_REQUESTED("기관 연계");

    private final String label;

    NotificationType(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
