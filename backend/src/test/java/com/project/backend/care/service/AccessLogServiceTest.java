package com.project.backend.care.service;

import com.project.backend.care.dto.AccessLogResponse;
import com.project.backend.care.entity.AccessLog;
import com.project.backend.care.entity.AccessLogAction;
import com.project.backend.care.entity.AccessLogResourceType;
import com.project.backend.care.repository.AccessLogRepository;
import com.project.backend.care.repository.CareGuardianRepository;
import com.project.backend.care.entity.GuardianStatus;
import com.project.backend.common.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AccessLogServiceTest {

    @Mock AccessLogRepository accessLogRepository;
    @Mock CareGuardianRepository careGuardianRepository;

    @InjectMocks AccessLogService accessLogService;

    @Test
    void getLogs_보호자가_최신_50건_조회() {
        given(careGuardianRepository.existsByCareRecipientIdAndGuardianIdAndStatus(
                100L, 1L, GuardianStatus.ACTIVE)).willReturn(true);
        AccessLog log = sampleLog(1L, 100L);
        given(accessLogRepository.findByCareRecipientIdLatest(eq(100L), any()))
                .willReturn(List.of(log));

        List<AccessLogResponse> result = accessLogService.getLogs(1L, 100L, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).careRecipientId()).isEqualTo(100L);
    }

    @Test
    void getLogs_보호자_아닌_사용자는_FORBIDDEN() {
        given(careGuardianRepository.existsByCareRecipientIdAndGuardianIdAndStatus(
                100L, 99L, GuardianStatus.ACTIVE)).willReturn(false);

        assertThatThrownBy(() -> accessLogService.getLogs(99L, 100L, null))
                .isInstanceOf(ApiException.class)
                .extracting("status").isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void log_저장() {
        given(accessLogRepository.save(any())).willAnswer(inv -> inv.getArgument(0));

        accessLogService.log(1L, 100L, AccessLogAction.VIEW, AccessLogResourceType.RECORD, 10L);

        verify(accessLogRepository).save(any(AccessLog.class));
    }

    private AccessLog sampleLog(Long id, Long careRecipientId) {
        AccessLog log = AccessLog.builder()
                .actorId(1L).careRecipientId(careRecipientId)
                .action(AccessLogAction.VIEW).resourceType(AccessLogResourceType.RECORD)
                .resourceId(10L).build();
        ReflectionTestUtils.setField(log, "id", id);
        return log;
    }
}
