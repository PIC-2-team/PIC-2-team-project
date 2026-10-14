package com.project.backend.record.service;

import com.project.backend.care.entity.CareAssignment;
import com.project.backend.care.repository.CareAssignmentRepository;
import com.project.backend.common.exception.ApiException;
import com.project.backend.record.dto.CreateRecordRequestRequest;
import com.project.backend.record.dto.RecordRequestResponse;
import com.project.backend.record.entity.RecordRequest;
import com.project.backend.record.entity.RecordRequestStatus;
import com.project.backend.record.repository.RecordRequestRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class RecordRequestServiceTest {

    @Mock RecordRequestRepository recordRequestRepository;
    @Mock CareAssignmentRepository careAssignmentRepository;

    @InjectMocks RecordRequestService recordRequestService;

    @Test
    void create_지원사가_배정_중인_당사자에_요청_생성() {
        given(recordRequestRepository.findByIdempotencyKey("key-1")).willReturn(Optional.empty());
        given(careAssignmentRepository.findBySupportWorkerIdAndEndedAtIsNull(2L))
                .willReturn(List.of(activeAssignment(10L, 100L, 2L)));
        given(recordRequestRepository.save(any())).willAnswer(inv -> {
            RecordRequest r = inv.getArgument(0);
            ReflectionTestUtils.setField(r, "id", 1L);
            return r;
        });

        RecordRequestResponse result = recordRequestService.create(
                2L, 100L, new CreateRecordRequestRequest("key-1", "메시지"));

        assertThat(result.status()).isEqualTo(RecordRequestStatus.PENDING);
        assertThat(result.idempotencyKey()).isEqualTo("key-1");
    }

    @Test
    void create_배정_없는_지원사는_FORBIDDEN() {
        given(recordRequestRepository.findByIdempotencyKey(any())).willReturn(Optional.empty());
        given(careAssignmentRepository.findBySupportWorkerIdAndEndedAtIsNull(99L))
                .willReturn(List.of());

        assertThatThrownBy(() -> recordRequestService.create(
                99L, 100L, new CreateRecordRequestRequest("key-x", null)))
                .isInstanceOf(ApiException.class)
                .extracting("status").isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void create_같은_idempotencyKey면_기존_요청_반환() {
        RecordRequest existing = existingRequest(1L, "key-dup");
        given(recordRequestRepository.findByIdempotencyKey("key-dup"))
                .willReturn(Optional.of(existing));

        RecordRequestResponse result = recordRequestService.create(
                2L, 100L, new CreateRecordRequestRequest("key-dup", "재시도"));

        assertThat(result.id()).isEqualTo(1L);
        assertThat(result.idempotencyKey()).isEqualTo("key-dup");
    }

    @Test
    void cancel_본인_요청_취소() {
        RecordRequest request = existingRequest(1L, "key-1");
        given(recordRequestRepository.findById(1L)).willReturn(Optional.of(request));

        recordRequestService.cancel(2L, 1L);

        assertThat(request.getStatus()).isEqualTo(RecordRequestStatus.CANCELLED);
    }

    @Test
    void cancel_타인_요청_취소시_FORBIDDEN() {
        RecordRequest request = existingRequest(1L, "key-1");
        given(recordRequestRepository.findById(1L)).willReturn(Optional.of(request));

        assertThatThrownBy(() -> recordRequestService.cancel(99L, 1L))
                .isInstanceOf(ApiException.class)
                .extracting("status").isEqualTo(HttpStatus.FORBIDDEN);
    }

    private CareAssignment activeAssignment(Long orgId, Long careRecipientId, Long supportWorkerId) {
        CareAssignment a = CareAssignment.builder()
                .organizationId(orgId).careRecipientId(careRecipientId)
                .supportWorkerId(supportWorkerId).idempotencyKey("a-key")
                .startDate(LocalDate.now()).build();
        ReflectionTestUtils.setField(a, "id", 1L);
        return a;
    }

    private RecordRequest existingRequest(Long id, String key) {
        RecordRequest r = RecordRequest.builder()
                .organizationId(10L).careRecipientId(100L).supportWorkerId(2L)
                .idempotencyKey(key).message("기존 메시지").build();
        ReflectionTestUtils.setField(r, "id", id);
        return r;
    }
}
