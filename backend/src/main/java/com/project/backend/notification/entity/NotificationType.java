package com.project.backend.notification.entity;

public enum NotificationType {
    RECORD_CREATED("새 기록"),
    RECORD_UPDATED("기록 수정"),
    ASSIGNMENT_CHANGED("배정"),
    SUGGESTION_RECEIVED("수정 제안"),
    SUGGESTION_DECIDED("제안 결과"),
    INFORMATION_REQUEST_RECEIVED("정보 요청"),
    RECORD_REQUEST_RECEIVED("기록 요청"),
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
