package com.project.backend.care.service;

import com.project.backend.care.dto.RoutineRequest;
import com.project.backend.care.dto.RoutineResponse;
import com.project.backend.care.entity.CareRecipientRoutine;
import com.project.backend.care.repository.CareRecipientRoutineRepository;
import com.project.backend.common.exception.ApiException;
import com.project.backend.record.service.RecordAccessService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class CareRecipientRoutineServiceTest {
    @Mock CareRecipientRoutineRepository routines;
    @Mock RecordAccessService access;
    @InjectMocks CareRecipientRoutineService service;

    private CareRecipientRoutine routine(long id, long recipientId, String time, String title, String memo) {
        CareRecipientRoutine r = CareRecipientRoutine.builder()
                .careRecipientId(recipientId).routineTime(LocalTime.parse(time)).title(title).memo(memo).build();
        ReflectionTestUtils.setField(r, "id", id);
        return r;
    }

    @Test
    void list_접근_권한을_확인하고_시간순_목록을_반환한다() {
        given(routines.findByCareRecipientIdOrderByRoutineTimeAscIdAsc(42L)).willReturn(List.of(
                routine(1, 42, "07:30", "기상", null), routine(2, 42, "08:00", "아침 식사", "천천히")));

        List<RoutineResponse> result = service.list(1L, 42L);

        verify(access).verifyRead(1L, 42L);
        assertThat(result).extracting(RoutineResponse::title).containsExactly("기상", "아침 식사");
        assertThat(result.get(1).time()).isEqualTo(LocalTime.of(8, 0));
        assertThat(result.get(1).memo()).isEqualTo("천천히");
    }

    @Test
    void create_보호자만_가능하며_제목_공백은_제거하고_빈_메모는_null로_저장한다() {
        given(routines.save(any(CareRecipientRoutine.class))).willAnswer(inv -> {
            CareRecipientRoutine r = inv.getArgument(0);
            ReflectionTestUtils.setField(r, "id", 10L);
            return r;
        });

        RoutineResponse response = service.create(1L, 42L, new RoutineRequest(LocalTime.of(9, 0), "  산책  ", "   "));

        verify(access).verifyGuardian(1L, 42L);
        assertThat(response.id()).isEqualTo(10L);
        assertThat(response.careRecipientId()).isEqualTo(42L);
        assertThat(response.title()).isEqualTo("산책");
        assertThat(response.memo()).isNull();
    }

    @Test
    void update_같은_당사자의_루틴을_수정한다() {
        CareRecipientRoutine existing = routine(5, 42, "07:30", "기상", "메모");
        given(routines.findByIdAndCareRecipientId(5L, 42L)).willReturn(Optional.of(existing));

        RoutineResponse response = service.update(1L, 42L, 5L, new RoutineRequest(LocalTime.of(8, 15), "약 복용", "식후"));

        verify(access).verifyGuardian(1L, 42L);
        assertThat(response.time()).isEqualTo(LocalTime.of(8, 15));
        assertThat(response.title()).isEqualTo("약 복용");
        assertThat(existing.getMemo()).isEqualTo("식후");
    }

    @Test
    void update_다른_당사자의_루틴이면_404() {
        given(routines.findByIdAndCareRecipientId(5L, 42L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(1L, 42L, 5L, new RoutineRequest(LocalTime.of(8, 0), "산책", null)))
                .isInstanceOf(ApiException.class)
                .extracting("status").isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void delete_보호자가_삭제한다() {
        CareRecipientRoutine existing = routine(5, 42, "07:30", "기상", null);
        given(routines.findByIdAndCareRecipientId(5L, 42L)).willReturn(Optional.of(existing));

        service.delete(1L, 42L, 5L);

        verify(access).verifyGuardian(1L, 42L);
        verify(routines).delete(existing);
    }

    @Test
    void delete_다른_당사자의_루틴이면_404이고_삭제하지_않는다() {
        given(routines.findByIdAndCareRecipientId(5L, 42L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(1L, 42L, 5L))
                .isInstanceOf(ApiException.class)
                .extracting("status").isEqualTo(HttpStatus.NOT_FOUND);
        verify(routines, never()).delete(any());
    }
}
