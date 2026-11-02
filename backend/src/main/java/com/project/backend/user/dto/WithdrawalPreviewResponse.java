package com.project.backend.user.dto;

import java.util.List;

/** endedAssignmentCount: 탈퇴로 종료되는 활성 배정 수 (활동지원사는 본인 배정, 기관은 소유 기관의 배정) */
public record WithdrawalPreviewResponse(List<Item> recipients, int endedAssignmentCount) {
    public enum Resolution { SUCCESSION, CHOICE, DELETE_ONLY }

    public record Item(Long careRecipientId, String name, Resolution resolution) { }
}
