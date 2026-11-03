package com.project.backend.notification.service;

import com.project.backend.common.exception.ApiException;
import com.project.backend.notification.entity.Notification;
import com.project.backend.notification.entity.NotificationType;
import com.project.backend.notification.repository.NotificationRepository;
import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;
import com.project.backend.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.test.util.ReflectionTestUtils;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class NotificationSummaryServiceTest {
    @Mock
    private NotificationRepository notifications;
    @Mock
    private UserRepository users;
    @Mock
    private UnreadNotificationSummaryGenerator generator;
    @Spy
    private Clock clock = Clock.fixed(Instant.parse("2026-11-01T10:00:00Z"), ZoneId.of("UTC"));
    @InjectMocks
    private NotificationSummaryService service;

    @Test
    void summarizesAndMarksTheIncludedUnreadNotificationsAsRead() {
        User guardian = User.builder().name("보호자").email("guardian@example.com")
                .publicCode("G-1").role(UserRole.GUARDIAN).build();
        Notification newest = new Notification(1L, NotificationType.RECORD_CREATED,
                "새 기록이 등록되었습니다.", Instant.parse("2026-11-01T09:00:00Z"));
        Notification older = new Notification(1L, NotificationType.ASSIGNMENT_CHANGED,
                "새 활동지원사가 배정되었습니다.", Instant.parse("2026-10-31T09:00:00Z"));
        ReflectionTestUtils.setField(newest, "id", 11L);
        ReflectionTestUtils.setField(older, "id", 12L);
        List<Notification> unread = List.of(newest, older);
        given(users.findById(1L)).willReturn(Optional.of(guardian));
        given(notifications.findByUserIdAndReadOrderByCreatedAtDescIdDesc(1L, false)).willReturn(unread);
        given(generator.generate(unread)).willReturn("새 기록과 활동지원사 배정이 있습니다.");

        NotificationSummaryResponse response = service.summarize(1L);

        assertThat(response.unreadCount()).isEqualTo(2);
        assertThat(response.summary()).isEqualTo("새 기록과 활동지원사 배정이 있습니다.");
        assertThat(response.generatedAt()).isEqualTo(Instant.parse("2026-11-01T10:00:00Z"));
        verify(notifications).findByUserIdAndReadOrderByCreatedAtDescIdDesc(1L, false);
        verify(notifications).markReadByUserIdAndIds(1L, List.of(11L, 12L));
    }

    @Test
    void returnsEmptySummaryWhenThereAreNoUnreadNotifications() {
        User guardian = User.builder().name("보호자").email("guardian@example.com")
                .publicCode("G-1").role(UserRole.GUARDIAN).build();
        given(users.findById(1L)).willReturn(Optional.of(guardian));
        given(notifications.findByUserIdAndReadOrderByCreatedAtDescIdDesc(1L, false)).willReturn(List.of());

        NotificationSummaryResponse response = service.summarize(1L);

        assertThat(response.unreadCount()).isZero();
        assertThat(response.summary()).isNull();
        verifyNoInteractions(generator);
    }

    @Test
    void rejectsUnsupportedUserRoles() {
        User admin = User.builder().name("관리자").email("admin@example.com")
                .publicCode("A-1").role(UserRole.ADMIN).build();
        given(users.findById(2L)).willReturn(Optional.of(admin));

        assertThatThrownBy(() -> service.summarize(2L))
                .isInstanceOf(ApiException.class)
                .hasMessage("미확인 알림 요약을 사용할 수 없는 사용자입니다.");
        verifyNoInteractions(notifications, generator);
    }
}
