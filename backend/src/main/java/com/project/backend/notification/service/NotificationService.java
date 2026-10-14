package com.project.backend.notification.service;

import com.project.backend.care.entity.GuardianStatus;
import com.project.backend.care.repository.CareGuardianRepository;
import com.project.backend.common.exception.ApiException;
import com.project.backend.common.response.PaginatedData;
import com.project.backend.notification.dto.NotificationResponse;
import com.project.backend.notification.entity.Notification;
import com.project.backend.notification.entity.NotificationType;
import com.project.backend.notification.repository.NotificationRepository;
import com.project.backend.user.entity.User;
import com.project.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Clock;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationService {
    private final NotificationRepository notifications;
    private final CareGuardianRepository guardians;
    private final UserRepository users;
    private final Clock clock;

    @Transactional(readOnly = true)
    public PaginatedData<NotificationResponse> list(Long userId, Boolean read, int page, int pageSize) {
        Pageable pageable = pageable(page, pageSize);
        Page<Notification> result = read == null
                ? notifications.findByUserId(userId, pageable)
                : notifications.findByUserIdAndRead(userId, read, pageable);
        return new PaginatedData<>(result.map(NotificationResponse::from).toList(), pagination(result));
    }

    public NotificationResponse markRead(Long userId, Long notificationId, boolean read) {
        Notification notification = notifications.findByIdAndUserId(notificationId, userId)
                .orElseThrow(this::notFound);
        notification.markRead(read);
        return NotificationResponse.from(notification);
    }

    public void notifySuggestionReceived(Long careRecipientId) {
        var guardianIds = guardians.findByCareRecipientIdAndStatus(careRecipientId, GuardianStatus.ACTIVE).stream()
                .map(guardian -> guardian.getGuardianId()).distinct().toList();
        Map<Long, User> guardianUsers = users.findAllById(guardianIds).stream()
                .collect(Collectors.toMap(User::getId, user -> user));
        for (Long guardianId : guardianIds) {
            User guardian = guardianUsers.get(guardianId);
            if (guardian != null && guardian.isSuggestionReceived()) {
                notifications.save(new Notification(guardianId, NotificationType.SUGGESTION_RECEIVED,
                        "새 생활기록 수정 제안이 도착했습니다.", clock.instant()));
            }
        }
    }

    public void notifySuggestionDecided(Long suggestedById, boolean approved) {
        String result = approved ? "승인" : "거절";
        notifications.save(new Notification(suggestedById, NotificationType.SUGGESTION_DECIDED,
                "생활기록 수정 제안이 " + result + "됐습니다.", clock.instant()));
    }

    public void notifyInformationRequest(Long userId, String message) {
        User user = users.findById(userId).orElse(null);
        if (user != null && user.isInformationRequestReceived()) {
            notifications.save(new Notification(userId, NotificationType.INFORMATION_REQUEST_RECEIVED,
                    message, clock.instant()));
        }
    }

    public void notifyInformationRequestGuardians(Long careRecipientId) {
        var guardianIds = guardians.findByCareRecipientIdAndStatus(careRecipientId, GuardianStatus.ACTIVE).stream()
                .map(guardian -> guardian.getGuardianId()).distinct().toList();
        for (Long guardianId : guardianIds) {
            notifyInformationRequest(guardianId, "새 정보 요청이 도착했습니다.");
        }
    }

    private Pageable pageable(int page, int pageSize) {
        if (page < 1 || pageSize < 1 || pageSize > 100) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "페이지 조건이 올바르지 않습니다.");
        }
        return PageRequest.of(page - 1, pageSize, Sort.by(Sort.Direction.DESC, "createdAt", "id"));
    }

    private PaginatedData.Pagination pagination(Page<?> page) {
        return new PaginatedData.Pagination(page.getNumber() + 1, page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    private ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "NOTIFICATION_NOT_FOUND", "알림을 찾을 수 없습니다.");
    }
}
