package com.project.backend.record.service;

import com.project.backend.care.entity.AccessLogAction;
import com.project.backend.care.entity.AccessLogResourceType;
import com.project.backend.care.entity.CareRecipient;
import com.project.backend.care.entity.Gender;
import com.project.backend.care.repository.CareRecipientRepository;
import com.project.backend.care.service.AccessLogService;
import com.project.backend.record.dto.CreateRecordRequest;
import com.project.backend.record.dto.UpdateRecordRequest;
import com.project.backend.record.entity.DailyRecord;
import com.project.backend.record.entity.RecordCategory;
import com.project.backend.record.media.RecordMedia;
import com.project.backend.record.media.RecordMediaService;
import com.project.backend.record.repository.DailyRecordRepository;
import com.project.backend.record.repository.RecordRevisionRepository;
import com.project.backend.user.entity.User;
import com.project.backend.user.entity.UserRole;
import com.project.backend.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.*;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class DailyRecordServiceTest {

    @Mock DailyRecordRepository records;
    @Mock RecordRevisionRepository revisions;
    @Mock CareRecipientRepository recipients;
    @Mock UserRepository users;
    @Mock RecordAccessService access;
    @Mock RecordMediaService media;
    @Mock Clock clock;
    @Mock AccessLogService accessLogService;

    @InjectMocks DailyRecordService recordService;

    @Test
    void create_호출시_CREATE_RECORD_로그_저장() {
        given(clock.instant()).willReturn(Instant.parse("2026-10-15T00:00:00Z"));
        given(media.validateIds(100L, null)).willReturn(List.of());
        given(recipients.findForUpdate(100L)).willReturn(Optional.of(careRecipient(100L)));
        DailyRecord record = dailyRecord(200L, 1L, 100L);
        given(records.save(any())).willReturn(record);
        given(users.findById(1L)).willReturn(Optional.of(user(1L)));
        given(media.forRecord(200L)).willReturn(List.of());

        recordService.create(1L, 100L, new CreateRecordRequest(
                "내용", RecordCategory.COMMUNICATION, OffsetDateTime.now(), null, null, null));

        verify(accessLogService).log(1L, 100L, AccessLogAction.CREATE, AccessLogResourceType.RECORD, 200L);
    }

    @Test
    void get_호출시_VIEW_RECORD_로그_저장() {
        DailyRecord record = dailyRecord(200L, 1L, 100L);
        given(records.findByIdAndCareRecipientId(200L, 100L)).willReturn(Optional.of(record));
        given(users.findById(1L)).willReturn(Optional.of(user(1L)));
        given(media.forRecord(200L)).willReturn(List.of());

        recordService.get(1L, 100L, 200L);

        verify(accessLogService).log(1L, 100L, AccessLogAction.VIEW, AccessLogResourceType.RECORD, 200L);
    }

    @Test
    void update_호출시_UPDATE_RECORD_로그_저장() {
        DailyRecord record = dailyRecord(200L, 1L, 100L);
        given(clock.instant()).willReturn(Instant.parse("2026-10-15T00:00:00Z"));
        given(records.findForUpdate(200L, 100L)).willReturn(Optional.of(record));
        given(revisions.latestRevision(200L)).willReturn(0);
        given(revisions.save(any())).willAnswer(inv -> inv.getArgument(0));
        given(recipients.findForUpdate(100L)).willReturn(Optional.of(careRecipient(100L)));
        given(users.findById(1L)).willReturn(Optional.of(user(1L)));
        given(media.forRecord(200L)).willReturn(List.of());

        recordService.update(1L, 100L, 200L, new UpdateRecordRequest("수정내용", null, null, null));

        verify(accessLogService).log(1L, 100L, AccessLogAction.UPDATE, AccessLogResourceType.RECORD, 200L);
    }

    @Test
    void delete_호출시_DELETE_RECORD_로그_저장() {
        DailyRecord record = dailyRecord(200L, 1L, 100L);
        given(clock.instant()).willReturn(Instant.parse("2026-10-15T00:00:00Z"));
        given(records.findForUpdate(200L, 100L)).willReturn(Optional.of(record));

        recordService.delete(1L, 100L, 200L);

        verify(accessLogService).log(1L, 100L, AccessLogAction.DELETE, AccessLogResourceType.RECORD, 200L);
    }

    @Test
    @SuppressWarnings("unchecked")
    void list_호출시_VIEW_RECORD_로그_저장() {
        given(records.findAll(any(Specification.class), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of()));

        recordService.list(1L, 100L, null, null, null, 1, 20);

        verify(accessLogService).log(1L, 100L, AccessLogAction.VIEW, AccessLogResourceType.RECORD, null);
    }

    @Test
    @SuppressWarnings("unchecked")
    void today_호출시_VIEW_RECORD_로그_저장() {
        given(clock.instant()).willReturn(Instant.parse("2026-10-15T00:00:00Z"));
        given(records.findAll(any(Specification.class), any(Sort.class))).willReturn(List.of());

        recordService.today(1L, 100L);

        verify(accessLogService).log(1L, 100L, AccessLogAction.VIEW, AccessLogResourceType.RECORD, null);
    }

    private DailyRecord dailyRecord(Long id, Long authorId, Long careRecipientId) {
        DailyRecord r = DailyRecord.builder()
                .careRecipientId(careRecipientId).authorId(authorId)
                .content("테스트 내용").category(RecordCategory.COMMUNICATION)
                .recordedAt(Instant.parse("2026-10-15T00:00:00Z"))
                .pinned(false).now(Instant.parse("2026-10-15T00:00:00Z"))
                .build();
        ReflectionTestUtils.setField(r, "id", id);
        return r;
    }

    private CareRecipient careRecipient(Long id) {
        CareRecipient r = CareRecipient.builder()
                .careRecipientNumber("R-TEST0001").name("테스트")
                .birthDate(java.time.LocalDate.of(2000, 1, 1)).gender(Gender.MALE).build();
        ReflectionTestUtils.setField(r, "id", id);
        return r;
    }

    private User user(Long id) {
        User u = User.builder().name("테스트").email("t@test.com").publicCode("T-X")
                .role(UserRole.GUARDIAN).build();
        ReflectionTestUtils.setField(u, "id", id);
        return u;
    }
}
