package com.project.backend.notification.service;

import com.project.backend.common.exception.ApiException;
import com.project.backend.notification.entity.Notification;
import com.project.backend.notification.repository.NotificationRepository;
import com.project.backend.user.entity.UserRole;
import com.project.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationSummaryService {
    private final NotificationRepository notifications;
    private final UserRepository users;
    private final UnreadNotificationSummaryGenerator generator;
    private final Clock clock;

    public NotificationSummaryResponse summarize(Long userId) {
        var user = users.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "사용자를 찾을 수 없습니다."));
        if (user.getRole() != UserRole.GUARDIAN
                && user.getRole() != UserRole.SUPPORT_WORKER
                && user.getRole() != UserRole.INSTITUTION) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "미확인 알림 요약을 사용할 수 없는 사용자입니다.");
        }

        List<Notification> unread = notifications.findByUserIdAndReadOrderByCreatedAtDescIdDesc(userId, false);
        String summary = unread.isEmpty() ? null : generator.generate(unread);
        if (summary != null) {
            List<Long> summarizedIds = unread.stream().map(Notification::getId).toList();
            notifications.markReadByUserIdAndIds(userId, summarizedIds);
        }
        return new NotificationSummaryResponse(unread.size(), summary, clock.instant());
    }
}
