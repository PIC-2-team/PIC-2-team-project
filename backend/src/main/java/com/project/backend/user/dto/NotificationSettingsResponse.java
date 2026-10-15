package com.project.backend.user.dto;

import com.project.backend.user.entity.User;

public record NotificationSettingsResponse(boolean recordCreated, boolean recordUpdated, boolean assignmentChanged,
                                           boolean suggestionReceived, boolean informationRequestReceived,
                                           boolean recordRequestReceived) {
    public static NotificationSettingsResponse from(User user) {
        return new NotificationSettingsResponse(user.isRecordCreated(), user.isRecordUpdated(),
                user.isAssignmentChanged(), user.isSuggestionReceived(), user.isInformationRequestReceived(),
                user.isRecordRequestReceived());
    }
}
