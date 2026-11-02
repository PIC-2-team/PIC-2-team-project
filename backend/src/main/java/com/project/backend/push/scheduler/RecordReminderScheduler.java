package com.project.backend.push.scheduler;

import com.project.backend.push.entity.PushSubscription;
import com.project.backend.push.service.PushSubscriptionService;
import com.project.backend.push.service.WebPushService;
import com.project.backend.record.repository.DailyRecordRepository;
import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;
import com.project.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class RecordReminderScheduler {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final DailyRecordRepository dailyRecords;
    private final UserRepository users;
    private final PushSubscriptionService pushSubscriptionService;
    private final WebPushService webPushService;

    @Scheduled(cron = "0 0 18 * * *", zone = "Asia/Seoul")
    public void sendRecordReminder() {
        LocalDate today = LocalDate.now(SEOUL);
        Instant startOfDay = today.atStartOfDay(SEOUL).toInstant();
        Instant endOfDay = today.plusDays(1).atStartOfDay(SEOUL).toInstant();

        Set<Long> authoredToday = Set.copyOf(
                dailyRecords.findAuthorIdsByRecordedAtBetween(startOfDay, endOfDay)
        );

        List<Long> targetUserIds = users.findByRoleIn(List.of(UserRole.GUARDIAN, UserRole.SUPPORT_WORKER))
                .stream()
                .map(User::getId)
                .filter(id -> !authoredToday.contains(id))
                .collect(Collectors.toList());

        if (targetUserIds.isEmpty()) {
            log.debug("오늘 미기록 유저 없음 — Push 발송 생략");
            return;
        }

        List<PushSubscription> subscriptions = pushSubscriptionService.findAllByUserIds(targetUserIds);
        log.info("오늘 기록 리마인더 Push 발송 대상: {}명, 구독 {}건", targetUserIds.size(), subscriptions.size());

        for (PushSubscription sub : subscriptions) {
            webPushService.send(sub, "삶결", "오늘 돌봄 기록을 아직 남기지 않으셨어요. 지금 기록하러 가기 →");
        }
    }
}
