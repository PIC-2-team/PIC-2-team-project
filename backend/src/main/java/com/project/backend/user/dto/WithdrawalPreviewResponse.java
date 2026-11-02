package com.project.backend.user.dto;

import java.util.List;

public record WithdrawalPreviewResponse(List<Item> recipients) {
    public enum Resolution { SUCCESSION, CHOICE, DELETE_ONLY }

    public record Item(Long careRecipientId, String name, Resolution resolution) { }
}
