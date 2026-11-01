package com.project.backend.schedule.service;

import com.project.backend.common.exception.ApiException;
import com.project.backend.record.service.RecordAccessService;
import com.project.backend.schedule.dto.*;
import com.project.backend.schedule.entity.Schedule;
import com.project.backend.schedule.repository.ScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ScheduleService {
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final ScheduleRepository schedules;
    private final RecordAccessService access;
    private final Clock clock;

    public ScheduleResponse create(Long userId, Long recipientId, CreateScheduleRequest req) {
        access.verifyCreate(userId, recipientId);
        Schedule schedule = schedules.save(Schedule.builder()
                .careRecipientId(recipientId)
                .createdById(userId)
                .title(req.title())
                .description(req.description())
                .scheduledAt(req.scheduledAt().toInstant())
                .now(clock.instant())
                .build());
        return ScheduleResponse.of(schedule);
    }

    @Transactional(readOnly = true)
    public List<ScheduleResponse> listByMonth(Long userId, Long recipientId, int year, int month) {
        access.verifyRead(userId, recipientId);
        LocalDate start = YearMonth.of(year, month).atDay(1);
        Instant from = start.atStartOfDay(SEOUL).toInstant();
        Instant to = start.plusMonths(1).atStartOfDay(SEOUL).toInstant();
        return schedules.findByCareRecipientIdAndScheduledAtBetweenOrderByScheduledAtAsc(
                recipientId, from, to).stream().map(ScheduleResponse::of).toList();
    }

    public ScheduleResponse update(Long userId, Long recipientId, Long scheduleId, UpdateScheduleRequest req) {
        access.verifyRead(userId, recipientId);
        Schedule schedule = find(scheduleId, recipientId);
        access.verifyEdit(userId, recipientId, schedule.getCreatedById());
        schedule.update(req.title(), req.description(),
                req.scheduledAt() == null ? null : req.scheduledAt().toInstant(),
                clock.instant());
        return ScheduleResponse.of(schedule);
    }

    public void delete(Long userId, Long recipientId, Long scheduleId) {
        access.verifyRead(userId, recipientId);
        Schedule schedule = find(scheduleId, recipientId);
        access.verifyEdit(userId, recipientId, schedule.getCreatedById());
        schedules.delete(schedule);
    }

    private Schedule find(Long scheduleId, Long recipientId) {
        return schedules.findByIdAndCareRecipientId(scheduleId, recipientId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "SCHEDULE_NOT_FOUND", "일정을 찾을 수 없습니다."));
    }
}
