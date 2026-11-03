package com.project.backend.care.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@EnableScheduling
@RequiredArgsConstructor
public class RecipientPurgeScheduler {
    private static final Logger log = LoggerFactory.getLogger(RecipientPurgeScheduler.class);

    private final RecipientPurgeService purgeService;

    // 서버가 한 대라는 전제다. 여러 대로 늘리면 중복 실행을 막는 잠금이 필요하다
    @Scheduled(cron = "${withdrawal.purge-cron:0 30 4 * * *}", zone = "Asia/Seoul")
    public void purge() {
        int purged = purgeService.purgeExpired(LocalDateTime.now());
        if (purged > 0) log.info("삭제 유예가 지난 당사자 {}명을 영구 삭제했습니다.", purged);
    }
}
