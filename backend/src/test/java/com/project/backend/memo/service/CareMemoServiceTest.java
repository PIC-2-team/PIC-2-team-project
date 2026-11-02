package com.project.backend.memo.service;

import com.project.backend.common.exception.ApiException;
import com.project.backend.memo.dto.CreateMemoRequest;
import com.project.backend.memo.dto.UpdateMemoRequest;
import com.project.backend.memo.entity.CareMemo;
import com.project.backend.memo.repository.CareMemoRepository;
import com.project.backend.record.service.RecordAccessService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.*;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CareMemoServiceTest {
    @Mock CareMemoRepository memos;
    @Mock RecordAccessService access;
    @Mock Clock clock;
    @InjectMocks CareMemoService service;

    @Test
    void listToday_서울_오늘_날짜로_조회한다() {
        // 서울 기준 2026-11-02 23:59 (UTC 14:59)
        when(clock.instant()).thenReturn(Instant.parse("2026-11-02T14:59:00Z"));
        when(memos.findByCareRecipientIdAndDateOrderByCreatedAtAsc(42L, LocalDate.of(2026, 11, 2)))
                .thenReturn(List.of());

        service.listToday(1L, 42L);

        verify(memos).findByCareRecipientIdAndDateOrderByCreatedAtAsc(42L, LocalDate.of(2026, 11, 2));
    }

    @Test
    void listByMonth_작성일_기준으로_해당_월의_메모를_조회한다() {
        LocalDate firstDay = LocalDate.of(2026, 11, 1);
        LocalDate firstDayOfNextMonth = LocalDate.of(2026, 12, 1);
        CareMemo memo = CareMemo.builder()
                .careRecipientId(42L)
                .createdById(1L)
                .date(LocalDate.of(2026, 11, 2))
                .content("메모")
                .now(Instant.parse("2026-11-02T01:00:00Z"))
                .build();
        when(memos.findByCareRecipientIdAndDateGreaterThanEqualAndDateLessThanOrderByDateAscCreatedAtAsc(
                42L, firstDay, firstDayOfNextMonth)).thenReturn(List.of(memo));

        var result = service.listByMonth(1L, 42L, 2026, 11);

        assertThat(result).extracting("date").containsExactly(LocalDate.of(2026, 11, 2));
        verify(access).verifyRead(1L, 42L);
        verify(memos).findByCareRecipientIdAndDateGreaterThanEqualAndDateLessThanOrderByDateAscCreatedAtAsc(
                42L, firstDay, firstDayOfNextMonth);
    }

    @Test
    void listByMonth_잘못된_월은_거부한다() {
        assertThatThrownBy(() -> service.listByMonth(1L, 42L, 2026, 13))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getCode()).isEqualTo("VALIDATION_ERROR"));

        verifyNoInteractions(memos);
    }

    @Test
    void create_접근권한없으면_예외를던진다() {
        doThrow(new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "접근 권한이 없습니다."))
                .when(access).verifyCreate(1L, 42L);

        assertThatThrownBy(() ->
                service.create(1L, 42L, new CreateMemoRequest("내용")))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void create_요청한_날짜와_무관하게_서울_작성일로_저장한다() {
        Instant now = Instant.parse("2026-11-03T00:30:00Z");
        when(clock.instant()).thenReturn(now);
        when(memos.save(any(CareMemo.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.create(1L, 42L,
                new CreateMemoRequest("내용"));

        assertThat(result.date()).isEqualTo(LocalDate.of(2026, 11, 3));
    }

    @Test
    void update_작성자가아니면_예외를던진다() {
        CareMemo memo = CareMemo.builder()
                .careRecipientId(42L)
                .createdById(99L) // 다른 사용자
                .date(LocalDate.of(2026, 11, 2))
                .content("기존 내용")
                .now(Instant.now())
                .build();
        when(memos.findByIdAndCareRecipientId(10L, 42L)).thenReturn(Optional.of(memo));
        doThrow(new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "접근 권한이 없습니다."))
                .when(access).verifyEdit(1L, 42L, 99L);

        assertThatThrownBy(() ->
                service.update(1L, 42L, 10L, new UpdateMemoRequest("수정 내용")))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void delete_존재하지않는메모면_예외를던진다() {
        when(memos.findByIdAndCareRecipientId(999L, 42L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(1L, 42L, 999L))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getCode()).isEqualTo("MEMO_NOT_FOUND"));
    }
}
