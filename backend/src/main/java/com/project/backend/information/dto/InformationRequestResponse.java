package com.project.backend.information.dto;

import com.project.backend.information.entity.InformationRequest;
import com.project.backend.information.entity.InformationRequestStatus;
import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;
import java.time.Instant;

public record InformationRequestResponse(Long id, Long careRecipientId, RequestedBy requestedBy, String message,
        InformationRequestStatus status, Reply reply, Instant createdAt, Instant updatedAt) {
    public record RequestedBy(Long id, String name, UserRole role) {}
    public record Reply(Long id, String name, String message, Instant repliedAt) {}

    public static InformationRequestResponse of(InformationRequest request, User requester, User replier) {
        Reply reply = request.getRepliedById() == null ? null : new Reply(replier.getId(), replier.getName(),
                request.getReplyMessage(), request.getRepliedAt());
        return new InformationRequestResponse(request.getId(), request.getCareRecipientId(),
                new RequestedBy(requester.getId(), requester.getName(), requester.getRole()), request.getMessage(),
                request.getStatus(), reply, request.getCreatedAt(), request.getUpdatedAt());
    }
}
