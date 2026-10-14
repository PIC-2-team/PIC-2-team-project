package com.project.backend.record.service;

import com.project.backend.care.entity.CareAssignment;
import com.project.backend.care.repository.CareAssignmentRepository;
import com.project.backend.common.exception.ApiException;
import com.project.backend.record.dto.CreateRecordRequestRequest;
import com.project.backend.record.dto.RecordRequestResponse;
import com.project.backend.record.entity.RecordRequest;
import com.project.backend.record.repository.RecordRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class RecordRequestService {

    private final RecordRequestRepository recordRequestRepository;
    private final CareAssignmentRepository careAssignmentRepository;

    public RecordRequestResponse create(Long supportWorkerId, Long careRecipientId,
                                        CreateRecordRequestRequest request) {
        Optional<RecordRequest> existing = recordRequestRepository.findByIdempotencyKey(request.idempotencyKey());
        if (existing.isPresent()) {
            return RecordRequestResponse.from(existing.get());
        }

        CareAssignment assignment = careAssignmentRepository
                .findBySupportWorkerIdAndEndedAtIsNull(supportWorkerId).stream()
                .filter(a -> a.getCareRecipientId().equals(careRecipientId))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN",
                        "현재 배정된 당사자에만 기록 요청을 보낼 수 있습니다."));

        RecordRequest saved = recordRequestRepository.save(RecordRequest.builder()
                .organizationId(assignment.getOrganizationId())
                .careRecipientId(careRecipientId)
                .supportWorkerId(supportWorkerId)
                .idempotencyKey(request.idempotencyKey())
                .message(request.message())
                .build());
        return RecordRequestResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<RecordRequestResponse> getForCareRecipient(Long careRecipientId) {
        return recordRequestRepository.findByCareRecipientId(careRecipientId).stream()
                .map(RecordRequestResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<RecordRequestResponse> getMine(Long supportWorkerId) {
        return recordRequestRepository.findBySupportWorkerId(supportWorkerId).stream()
                .map(RecordRequestResponse::from).toList();
    }

    public void cancel(Long supportWorkerId, Long requestId) {
        RecordRequest request = recordRequestRepository.findById(requestId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "RECORD_REQUEST_NOT_FOUND", "기록 요청을 찾을 수 없습니다."));
        if (!request.getSupportWorkerId().equals(supportWorkerId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "본인 요청만 취소할 수 있습니다.");
        }
        request.cancel();
    }

}
