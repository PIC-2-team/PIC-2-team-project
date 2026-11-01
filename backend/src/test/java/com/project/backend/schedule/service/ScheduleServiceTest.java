package com.project.backend.schedule.service;

import com.project.backend.common.exception.ApiException;
import com.project.backend.record.service.RecordAccessService;
import com.project.backend.schedule.repository.ScheduleRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.http.HttpStatus;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
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

    @ParameterizedTest
    @CsvSource({"2026,0", "2026,13", "2026,-1", "1899,5", "10000,5"})
    void listByMonth_연월이_범위를_벗어나면_422_예외(int year, int month) {
        assertThatThrownBy(() -> service.listByMonth(1L, 42L, year, month))
                .isInstanceOf(ApiException.class)
                .extracting("status").isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        verifyNoInteractions(schedules);
    }

    @ParameterizedTest
    @CsvSource({"1900,1", "1900,12", "9999,1", "9999,12", "2026,1", "2026,12"})
    void listByMonth_연월_경계값은_허용한다(int year, int month) {
        assertThatCode(() -> service.listByMonth(1L, 42L, year, month)).doesNotThrowAnyException();
    }
}
