package com.project.backend.care.service;

import com.project.backend.care.dto.RoutineRequest;
import com.project.backend.care.dto.RoutineResponse;
import com.project.backend.care.entity.CareRecipientRoutine;
import com.project.backend.care.repository.CareRecipientRoutineRepository;
import com.project.backend.common.exception.ApiException;
import com.project.backend.record.service.RecordAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class CareRecipientRoutineService {

    private final CareRecipientRoutineRepository routines;
    private final RecordAccessService access;

    @Transactional(readOnly = true)
    public List<RoutineResponse> list(Long userId, Long recipientId) {
        access.verifyRead(userId, recipientId);
        return routines.findByCareRecipientIdOrderByRoutineTimeAscIdAsc(recipientId).stream()
                .map(RoutineResponse::of).toList();
    }

    public RoutineResponse create(Long userId, Long recipientId, RoutineRequest request) {
        access.verifyGuardian(userId, recipientId);
        CareRecipientRoutine routine = routines.save(CareRecipientRoutine.builder()
                .careRecipientId(recipientId)
                .routineTime(request.time())
                .title(request.title())
                .memo(request.memo())
                .build());
        return RoutineResponse.of(routine);
    }

    public RoutineResponse update(Long userId, Long recipientId, Long routineId, RoutineRequest request) {
        access.verifyGuardian(userId, recipientId);
        CareRecipientRoutine routine = find(routineId, recipientId);
        routine.update(request.time(), request.title(), request.memo());
        return RoutineResponse.of(routine);
    }

    public void delete(Long userId, Long recipientId, Long routineId) {
        access.verifyGuardian(userId, recipientId);
        routines.delete(find(routineId, recipientId));
    }

    private CareRecipientRoutine find(Long routineId, Long recipientId) {
        return routines.findByIdAndCareRecipientId(routineId, recipientId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ROUTINE_NOT_FOUND", "루틴을 찾을 수 없습니다."));
    }
}
