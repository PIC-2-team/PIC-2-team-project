package com.project.backend.ai;

public record RecordDraftRequest(Long careRecipientId, InputType inputType, String text, Long mediaId) {
    public enum InputType { TEXT, AUDIO }
}
