package com.project.backend.notification.service;

import com.project.backend.care.entity.CareGuardian;
import com.project.backend.care.entity.GuardianStatus;
import com.project.backend.care.repository.CareGuardianRepository;
import com.project.backend.notification.entity.Notification;
import com.project.backend.notification.entity.NotificationType;
import com.project.backend.notification.repository.NotificationRepository;
import com.project.backend.user.entity.User;
import com.project.backend.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notifications;
    @Mock
    private CareGuardianRepository guardians;
    @Mock
    private UserRepository users;
    @Spy
    private Clock clock = Clock.fixed(Instant.parse("2026-10-22T10:00:00Z"), ZoneId.of("UTC"));

    @InjectMocks
    private NotificationService service;

    @Test
    @DisplayName("markAllRead 호출 시 repository의 markAllReadByUserId를 호출한다")
    void markAllRead() {
        given(notifications.markAllReadByUserId(1L)).willReturn(3);

        int updated = service.markAllRead(1L);

        assertThat(updated).isEqualTo(3);
        verify(notifications).markAllReadByUserId(1L);
    }

    @Test
    @DisplayName("countUnread 호출 시 repository의 countByUserIdAndRead를 호출한다")
    void countUnread() {
        given(notifications.countByUserIdAndRead(1L, false)).willReturn(5L);

        long count = service.countUnread(1L);

        assertThat(count).isEqualTo(5L);
        verify(notifications).countByUserIdAndRead(1L, false);
    }

    @Test
    @DisplayName("notifyAssignmentChanged: 알림 설정이 켜져 있으면 알림을 저장한다")
    void notifyAssignmentChanged_enabled() {
        User user = mock(User.class);
        given(user.isAssignmentChanged()).willReturn(true);
        given(users.findById(10L)).willReturn(Optional.of(user));

        service.notifyAssignmentChanged(10L, "새 당사자가 배정되었습니다.");

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notifications).save(captor.capture());
        Notification saved = captor.getValue();
        assertThat(saved.getUserId()).isEqualTo(10L);
        assertThat(saved.getType()).isEqualTo(NotificationType.ASSIGNMENT_CHANGED);
        assertThat(saved.getMessage()).isEqualTo("새 당사자가 배정되었습니다.");
    }

    @Test
    @DisplayName("notifyRecordRequest: 활동지원사에게 기록 요청 알림을 저장한다")
    void notifyRecordRequest_enabled() {
        User worker = mock(User.class);
        given(worker.isRecordRequestReceived()).willReturn(true);
        given(users.findById(20L)).willReturn(Optional.of(worker));

        service.notifyRecordRequest(20L, "도전행동 기록 작성 요청이 도착했습니다.");

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notifications).save(captor.capture());
        Notification saved = captor.getValue();
        assertThat(saved.getUserId()).isEqualTo(20L);
        assertThat(saved.getType()).isEqualTo(NotificationType.RECORD_REQUEST_RECEIVED);
    }
}
