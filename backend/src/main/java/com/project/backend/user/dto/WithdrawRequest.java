package com.project.backend.user.dto;

import java.util.List;

public record WithdrawRequest(List<Decision> decisions) {
    public enum Action { TRANSFER, DELETE }

    public record Decision(Long careRecipientId, Action action) { }

    public List<Decision> decisionsOrEmpty() {
        return decisions == null ? List.of() : decisions;
    }
}
