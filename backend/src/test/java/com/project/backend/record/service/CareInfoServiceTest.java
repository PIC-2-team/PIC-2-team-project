package com.project.backend.record.service;

import com.project.backend.care.entity.AccessLogAction;
import com.project.backend.care.entity.AccessLogResourceType;
import com.project.backend.care.entity.CareRecipient;
import com.project.backend.care.entity.Gender;
import com.project.backend.care.repository.CareRecipientRepository;
import com.project.backend.care.service.AccessLogService;
import com.project.backend.record.dto.PutCareInfoRequest;
import com.project.backend.record.entity.CareInfo;
import com.project.backend.record.entity.CareInfoCategory;
import com.project.backend.record.repository.CareInfoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class CareInfoServiceTest {

    @Mock CareInfoRepository infos;
    @Mock CareRecipientRepository recipients;
    @Mock RecordAccessService access;
    @Mock DailyRecordService records;
    @Mock Clock clock;
    @Mock AccessLogService accessLogService;

    @InjectMocks CareInfoService careInfoService;

    @Test
    void list_호출시_VIEW_CARE_INFO_로그_저장() {
        given(infos.findByCareRecipientId(100L)).willReturn(List.of());
        given(records.pinned(1L, 100L)).willReturn(List.of());

        careInfoService.list(1L, 100L);

        verify(accessLogService).log(1L, 100L, AccessLogAction.VIEW, AccessLogResourceType.CARE_INFO, null);
    }

    @Test
    void get_호출시_VIEW_CARE_INFO_로그_저장() {
        given(infos.findByCareRecipientIdAndCategory(100L, CareInfoCategory.COMMUNICATION))
                .willReturn(Optional.empty());

        careInfoService.get(1L, 100L, CareInfoCategory.COMMUNICATION);

        verify(accessLogService).log(1L, 100L, AccessLogAction.VIEW, AccessLogResourceType.CARE_INFO, null);
    }

    @Test
    void put_호출시_UPDATE_CARE_INFO_로그_저장() {
        given(clock.instant()).willReturn(Instant.parse("2026-10-15T00:00:00Z"));
        given(recipients.findForUpdate(100L)).willReturn(Optional.of(careRecipient(100L)));
        CareInfo info = new CareInfo(100L, CareInfoCategory.COMMUNICATION);
        given(infos.findByCareRecipientIdAndCategory(100L, CareInfoCategory.COMMUNICATION))
                .willReturn(Optional.of(info));
        given(infos.save(any())).willReturn(info);

        careInfoService.put(1L, 100L, CareInfoCategory.COMMUNICATION, new PutCareInfoRequest("내용"));

        verify(accessLogService).log(1L, 100L, AccessLogAction.UPDATE, AccessLogResourceType.CARE_INFO, null);
    }

    private CareRecipient careRecipient(Long id) {
        CareRecipient r = CareRecipient.builder()
                .careRecipientNumber("R-TEST0001").name("테스트")
                .birthDate(LocalDate.of(2000, 1, 1)).gender(Gender.MALE).build();
        ReflectionTestUtils.setField(r, "id", id);
        return r;
    }
}
