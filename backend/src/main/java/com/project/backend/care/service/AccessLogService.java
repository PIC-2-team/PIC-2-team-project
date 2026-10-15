package com.project.backend.care.service;

import com.project.backend.care.dto.AccessLogResponse;
import com.project.backend.care.entity.AccessLog;
import com.project.backend.care.entity.AccessLogAction;
import com.project.backend.care.entity.AccessLogResourceType;
import com.project.backend.care.entity.GuardianStatus;
import com.project.backend.care.repository.AccessLogRepository;
import com.project.backend.care.repository.CareGuardianRepository;
import com.project.backend.common.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class AccessLogService {

    private static final int PAGE_SIZE = 50;

    private final AccessLogRepository accessLogRepository;
    private final CareGuardianRepository careGuardianRepository;

    @Transactional(readOnly = true)
    public List<AccessLogResponse> getLogs(Long userId, Long careRecipientId, LocalDateTime before) {
        if (!careGuardianRepository.existsByCareRecipientIdAndGuardianIdAndStatus(
                careRecipientId, userId, GuardianStatus.ACTIVE)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "보호자만 접근 이력을 조회할 수 있습니다.");
        }

        List<AccessLog> logs = before != null
                ? accessLogRepository.findByCareRecipientIdCursor(careRecipientId, before, PageRequest.of(0, PAGE_SIZE))
                : accessLogRepository.findByCareRecipientIdLatest(careRecipientId, PageRequest.of(0, PAGE_SIZE));

        return logs.stream().map(AccessLogResponse::from).toList();
    }

    public void log(Long actorId, Long careRecipientId, AccessLogAction action,
                    AccessLogResourceType resourceType, Long resourceId) {
        accessLogRepository.save(AccessLog.builder()
                .actorId(actorId)
                .careRecipientId(careRecipientId)
                .action(action)
                .resourceType(resourceType)
                .resourceId(resourceId)
                .build());
    }
}
