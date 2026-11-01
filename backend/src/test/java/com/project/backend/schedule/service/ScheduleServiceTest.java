package com.project.backend.schedule.service;

import com.project.backend.record.service.RecordAccessService;
import com.project.backend.schedule.repository.ScheduleRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ScheduleServiceTest {
    @Mock ScheduleRepository schedules;
    @Mock RecordAccessService access;
    @Mock Clock clock;
    @InjectMocks ScheduleService service;

    @Test
    void listByMonth_다음달_자정은_조회범위에서_제외한다() {
        Instant from = Instant.parse("2026-10-31T15:00:00Z");
        Instant to = Instant.parse("2026-11-30T15:00:00Z");
        when(schedules.findByCareRecipientIdAndScheduledAtGreaterThanEqualAndScheduledAtLessThanOrderByScheduledAtAsc(42L, from, to))
                .thenReturn(List.of());

        service.listByMonth(1L, 42L, 2026, 11);

        verify(schedules).findByCareRecipientIdAndScheduledAtGreaterThanEqualAndScheduledAtLessThanOrderByScheduledAtAsc(42L, from, to);
    }
}
