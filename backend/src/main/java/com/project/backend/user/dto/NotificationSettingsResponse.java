package com.project.backend.user.dto;

import com.project.backend.user.entity.User;

public record NotificationSettingsResponse(boolean recordCreated, boolean recordUpdated, boolean assignmentChanged,
                                           boolean informationRequestReceived) {
    public static NotificationSettingsResponse from(User user) {
        return new NotificationSettingsResponse(user.isRecordCreated(), user.isRecordUpdated(),
                user.isAssignmentChanged(), user.isInformationRequestReceived());
    }
}
